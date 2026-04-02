/**
 * @module pi/hooks
 * Hook registration for the CODA Pi extension.
 *
 * Registers lifecycle hooks for state initialization, context injection,
 * and `.coda/` write protection.
 */

import { join, resolve, sep } from 'node:path';
import { loadState, persistState } from '@coda/core';
import { isToolCallEventType } from '@mariozechner/pi-coding-agent';
import type { ExtensionAPI, ExtensionContext, ToolResultEvent } from '@mariozechner/pi-coding-agent';
import { checkWriteGate } from '../tools';
import type { AdvanceInput, AdvanceResult } from '../tools';
import { getPhaseContext, runReviewRunner, runVerifyRunner } from '../workflow';
import type { CodaExtensionState, StateProvider } from './types';

/**
 * Register all CODA lifecycle hooks with Pi.
 *
 * @param pi - The Pi extension API
 * @param codaRoot - Path to the `.coda/` directory
 */
export function registerHooks(pi: ExtensionAPI, codaRoot: string): void {
  const statePath = join(codaRoot, 'state.json');
  const extensionState: CodaExtensionState = {
    statePath,
    currentState: null,
  };

  const stateProvider: StateProvider = {
    getState: () => extensionState.currentState,
    refreshState: () => {
      extensionState.currentState = loadState(extensionState.statePath);
      return extensionState.currentState;
    },
  };

  pi.on('session_start', async () => {
    stateProvider.refreshState();
  });

  pi.on('before_agent_start', async () => {
    try {
      const state = stateProvider.refreshState();
      if (!state?.focus_issue || !state.phase) {
        return {};
      }
    const phaseContext = getPhaseContext(state.phase, codaRoot, state.focus_issue, state);
      return {
        systemPrompt: phaseContext.systemPrompt,
        message: {
          customType: 'coda-context',
          content: phaseContext.context,
          display: true,
          details: {
            focusIssue: state.focus_issue,
            phase: phaseContext.metadata.phase,
            submode: phaseContext.metadata.submode,
            loopIteration: phaseContext.metadata.loopIteration,
            currentTask: phaseContext.metadata.currentTask,
            taskKind: phaseContext.metadata.taskKind,
          },
        },
      };
    } catch (err) {
      console.error('CODA before_agent_start hook failed:', formatCodaError(err), err);
      return {};
    }
  });

  pi.on('tool_call', async (event, ctx) => {
    // Intercept bash commands targeting .coda/
    if (isToolCallEventType('bash', event)) {
      const cmd = event.input.command;
      if (cmd && isBashWriteToCoda(cmd)) {
        return {
          block: true,
          reason: 'Use coda_* tools to modify .coda/ files',
        };
      }
      return {};
    }
    if (isToolCallEventType('write', event)) {
      return evaluateWriteGate('write', event.input.path, codaRoot, ctx.cwd, stateProvider);
    }
    if (isToolCallEventType('edit', event)) {
      return evaluateWriteGate('edit', event.input.path, codaRoot, ctx.cwd, stateProvider);
    }
    return {};
  });

  pi.on('tool_result', async (event, ctx) => {
    try {
      if (!isSuccessfulAdvanceToolResult(event)) {
        return {};
      }
    const trigger = handleAutonomousAdvanceTrigger(
        pi,
        ctx,
        codaRoot,
        statePath,
        event.input as AdvanceInput,
        event.details as AdvanceResult
      );

      stateProvider.refreshState();
    if (!trigger.summary) {
        return {};
      }
    return {
        content: [
          ...event.content,
          { type: 'text', text: trigger.summary },
        ],
        details: {
          ...(typeof event.details === 'object' && event.details !== null ? event.details as unknown as Record<string, unknown> : {}),
          autonomous_trigger: trigger.summary,
        },
      };
    } catch (err) {
      console.error('CODA tool_result hook failed:', formatCodaError(err), err);
      return {};
    }
  });
}

/**
 * Handle the operator-facing autonomous trigger after a successful coda_advance.
 *
 * Runs deterministic review/verify runners when entering those phases, persists
 * their outcomes, and queues the next agent turn for revise/correct work when needed.
 */
export function handleAutonomousAdvanceTrigger(
  pi: ExtensionAPI,
  ctx: ExtensionContext,
  codaRoot: string,
  statePath: string,
  advanceInput: AdvanceInput,
  advanceResult: AdvanceResult
): { triggered: boolean; queuedFollowUp: boolean; summary?: string } {
  if (!advanceResult.success) {
    return { triggered: false, queuedFollowUp: false };
  }

  const state = loadState(statePath);
  if (!state?.focus_issue || !state.phase) {
    return { triggered: false, queuedFollowUp: false };
  }

  if (
    advanceInput.human_review_decision === 'changes-requested'
    && state.phase === 'review'
    && state.submode === 'revise'
  ) {
    const queuedFollowUp = queueAutonomousFollowUp(pi, ctx, state);
    return {
      triggered: queuedFollowUp,
      queuedFollowUp,
      summary: queuedFollowUp ? 'Queued the autonomous revise follow-up for the recorded human changes.' : undefined,
    };
  }

  if (
    advanceInput.target_phase === 'review'
    && advanceResult.new_phase === 'review'
    && advanceResult.previous_phase !== 'review'
    && state.phase === 'review'
    && state.submode === 'review'
  ) {
    const reviewResult = runReviewRunner(codaRoot, state.focus_issue, state);
    persistState(reviewResult.state, statePath);

    if (reviewResult.outcome === 'revise-required') {
      const queuedFollowUp = queueAutonomousFollowUp(pi, ctx, reviewResult.state);
      return {
        triggered: true,
        queuedFollowUp,
        summary: queuedFollowUp
          ? 'Autonomous review ran, wrote revision instructions, and queued the revise follow-up.'
          : 'Autonomous review ran and wrote revision instructions.',
      };
    }

    if (reviewResult.outcome === 'approved') {
      return {
        triggered: true,
        queuedFollowUp: false,
        summary: 'Autonomous review ran and approved the plan.',
      };
    }

    if (reviewResult.outcome === 'exhausted') {
      return {
        triggered: true,
        queuedFollowUp: false,
        summary: 'Autonomous review is exhausted and awaiting operator guidance.',
      };
    }
  }

  if (
    advanceInput.target_phase === 'verify'
    && advanceResult.new_phase === 'verify'
    && advanceResult.previous_phase !== 'verify'
    && state.phase === 'verify'
    && state.submode === 'verify'
  ) {
    const verifyResult = runVerifyRunner(codaRoot, state.focus_issue, state);
    persistState(verifyResult.state, statePath);

    if (verifyResult.outcome === 'corrections-required') {
      const queuedFollowUp = queueAutonomousFollowUp(pi, ctx, verifyResult.state);
      return {
        triggered: true,
        queuedFollowUp,
        summary: queuedFollowUp
          ? 'Autonomous verify ran, wrote correction artifacts, and queued the correction follow-up.'
          : 'Autonomous verify ran and wrote correction artifacts.',
      };
    }

    if (verifyResult.outcome === 'success') {
      return {
        triggered: true,
        queuedFollowUp: false,
        summary: 'Autonomous verify ran and confirmed all acceptance criteria are met.',
      };
    }

    if (verifyResult.outcome === 'exhausted') {
      return {
        triggered: true,
        queuedFollowUp: false,
        summary: 'Autonomous verify is exhausted and awaiting operator guidance.',
      };
    }
  }

  return { triggered: false, queuedFollowUp: false };
}

/** Evaluate CODA write protections for a write-like tool call. */
function evaluateWriteGate(
  operation: 'write' | 'edit',
  path: string,
  codaRoot: string,
  cwd: string,
  stateProvider: StateProvider
): { block?: boolean; reason?: string } {
  if (isProtectedCodaPath(path, codaRoot, cwd)) {
    return {
      block: true,
      reason: 'Use coda_* tools to modify .coda/ files',
    };
  }

  let state: ReturnType<StateProvider['getState']>;
  try {
    state = stateProvider.refreshState() ?? stateProvider.getState();
  } catch (err) {
    return {
      block: true,
      reason: `Could not read CODA state; blocking write for safety: ${formatCodaError(err)}`,
    };
  }
  if (state?.tdd_gate !== 'locked') {
    return {};
  }
  const gateResult = checkWriteGate({ operation, path }, { tdd_gate: state.tdd_gate });
  if (gateResult.allowed) {
    return {};
  }
  return {
    block: true,
    reason: gateResult.reason ?? 'TDD gate locked. Write a failing test first.',
  };
}

function queueAutonomousFollowUp(pi: ExtensionAPI, ctx: ExtensionContext, state: NonNullable<ReturnType<typeof loadState>>): boolean {
  const followUp = buildAutonomousFollowUpMessage(state);
  if (!followUp) {
    return false;
  }

  if (ctx.isIdle()) {
    pi.sendUserMessage(followUp);
  } else {
    pi.sendUserMessage(followUp, { deliverAs: 'followUp' });
  }

  return true;
}

function buildAutonomousFollowUpMessage(state: NonNullable<ReturnType<typeof loadState>>): string | null {
  if (state.phase === 'review' && state.submode === 'revise') {
    return 'Continue the CODA revise loop for the focused issue using the injected context. Update the plan and tasks narrowly to address the revision instructions, then advance when ready.';
  }

  if (state.phase === 'verify' && state.submode === 'correct') {
    return 'Continue the CODA correction loop for the focused issue using the injected context. Complete the correction task narrowly, run the required tests, and advance when ready.';
  }

  return null;
}

function isSuccessfulAdvanceToolResult(event: ToolResultEvent): event is ToolResultEvent & {
  toolName: 'coda_advance';
  input: AdvanceInput;
  details: AdvanceResult;
} {
  if (event.toolName !== 'coda_advance' || event.isError) {
    return false;
  }

  if (typeof event.details !== 'object' || event.details === null) {
    return false;
  }

  const details = event.details as Record<string, unknown>;
  return details.success === true;
}

/** Return whether a write targets `.coda/` directly or by absolute path. */
function isProtectedCodaPath(path: string, codaRoot: string, cwd: string): boolean {
  if (path.startsWith('.coda/') || path.startsWith('.coda\\')) {
    return true;
  }

  const absolutePath = resolve(cwd, path);
  const absoluteCodaRoot = resolve(codaRoot);
  return absolutePath === absoluteCodaRoot || absolutePath.startsWith(`${absoluteCodaRoot}${sep}`);
}

function formatCodaError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  return `CODA error: ${message}`;
}

function tokenizeShellCommand(command: string): string[] {
  return command.match(/"[^"]*"|'[^']*'|`[^`]*`|[^\s]+/g) ?? [];
}

function normalizeShellToken(token: string): string {
  let normalized = token.trim();
  if (
    (normalized.startsWith('"') && normalized.endsWith('"'))
    || (normalized.startsWith("'") && normalized.endsWith("'"))
    || (normalized.startsWith('`') && normalized.endsWith('`'))
  ) {
    normalized = normalized.slice(1, -1);
  }
  return normalized.replace(/[;|&]+$/g, '');
}

function tokenTargetsCodaPath(token: string): boolean {
  return /(^|[\\/])\.coda(?:[\\/]|$)/.test(normalizeShellToken(token));
}

function findTargetPathToken(commandName: string, args: string[]): string | null {
  const normalizedArgs = args.map((arg) => normalizeShellToken(arg));
  const targetDirFlagIndex = normalizedArgs.findIndex((arg) => arg === '-t' || arg === '--target-directory');
  if (targetDirFlagIndex >= 0) {
    return normalizedArgs[targetDirFlagIndex + 1] ?? null;
  }

  if (commandName === 'cp' || commandName === 'mv' || commandName === 'install' || commandName === 'ln') {
    for (let index = normalizedArgs.length - 1; index >= 0; index -= 1) {
      const token = normalizedArgs[index];
      if (!token || token === '--') {
        continue;
      }
      if (token.startsWith('-')) {
        continue;
      }
      return token;
    }
  }

  return null;
}

function hasRedirectWriteToCoda(command: string): boolean {
  return /(?:^|[^\w])(?:1>>?|>>?)\s*['"]?(?:[^\s'"`]*[\\/])?\.coda(?:[\\/]|$)/.test(command);
}

/**
 * Detect bash commands that write to `.coda/` via redirection or common write patterns.
 *
 * Catches: `> .coda/`, `>> .coda/`, `1> .coda/`, `tee .coda/`, `cp ... .coda/`,
 * `mv ... .coda/`, `touch .coda/`, `mkdir .coda/`, `printf ... > .coda/`,
 * interpreter stdout redirects like `python -c ... > .coda/` or `node -e ... > .coda/`,
 * `sed -i .coda/`, `perl -i .coda/`, `truncate .coda/`, `chmod .coda/`,
 * `chown .coda/`, `ln ... .coda/`, and `install ... .coda/`.
 */
  function isBashWriteToCoda(command: string): boolean {
  if (hasRedirectWriteToCoda(command)) {
    return true;
  }
  if (/\btee\b[\s\S]*\.coda(?:[\\/]|$)/.test(command)) {
    return true;
  }
  if (/\bsed\b[\s\S]*\s-i(?:\s|$|['".]|[^a-zA-Z])[\s\S]*\.coda(?:[\\/]|$)/.test(command)) {
    return true;
  }
  if (/\bperl\b[\s\S]*\s-i(?:\S*)?(?:\s|$)[\s\S]*\.coda(?:[\\/]|$)/.test(command)) {
    return true;
  }
  const tokens = tokenizeShellCommand(command);
  const commandName = normalizeShellToken(tokens[0] ?? '');
  const args = tokens.slice(1);
  if (commandName === 'tee') {
    return args.some((arg) => tokenTargetsCodaPath(arg));
  }
  if (commandName === 'cp' || commandName === 'mv' || commandName === 'install' || commandName === 'ln') {
    const targetPath = findTargetPathToken(commandName, args);
    return targetPath !== null && tokenTargetsCodaPath(targetPath);
  }
  if (commandName === 'touch' || commandName === 'mkdir') {
    return args
      .filter((arg) => !normalizeShellToken(arg).startsWith('-'))
      .some((arg) => tokenTargetsCodaPath(arg));
  }

  if (
    commandName === 'rm'
    || commandName === 'truncate'
    || commandName === 'chmod'
    || commandName === 'chown'
  ) {
    return args.some((arg) => tokenTargetsCodaPath(arg));
  }
  return false;
}
