/**
 * @module pi/hooks
 * Hook registration for the CODA Pi extension.
 *
 * Registers lifecycle hooks for state initialization, context injection,
 * and `.coda/` write protection.
 */

import { basename, dirname, join, resolve, sep } from 'node:path';
import { existsSync, realpathSync } from 'node:fs';
import { loadState, persistState } from '@coda/core';
import { isToolCallEventType } from '@mariozechner/pi-coding-agent';
import type { ExtensionAPI, ExtensionContext, ToolResultEvent } from '@mariozechner/pi-coding-agent';
import { checkWriteGate } from '../tools';
import type { AdvanceInput, AdvanceResult } from '../tools';
import { getPhaseContext, runReviewRunner, runVerifyRunner } from '../workflow';
import { inputReferencesCoda, isBashWriteToCoda } from './write-gate-perimeter';
import type { CodaExtensionState, StateProvider } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Pi mutation tool surface audit (Phase 53, 2026-04-16)
//
// Source: node_modules/@mariozechner/pi-coding-agent/dist/core/extensions/types.d.ts (lines 505–623).
// Built-in tool types: bash, read, edit, write, grep, find, ls, custom.
// Mutating built-ins: write, edit (both intercepted below).
// No str_replace / apply_patch / multi_edit / create_file / patch in current Pi.
//
// Implication: tool-type perimeter is complete. The F7 regression documented
// in docs/v0.8/E2E-COMPOUNDING-FINDINGS.md must be either
//   (a) path-canonicalization gaps (./.coda/..., absolute paths) — covered by
//       write-gate-integration.test.ts below, OR
//   (b) extension-registered custom tools mutating via internal bypass — out
//       of scope for Phase 53; see Phase 55 for deeper hardening.
// When Pi adds new mutation tool types, extend the intercepts here and add
// cases in write-gate-integration.test.ts.
//
// Phase 55 hardening:
//   (a) `isProtectedCodaPath` resolves the PARENT directory via `realpathSync`
//       (not the leaf) so parent-dir symlinks (`link-dir/→.coda/`) are caught
//       even when the target file does not exist yet. Leaf realpath would
//       throw ENOENT on pre-write paths; parent-dir realpath is the sound
//       invariant because the parent MUST exist for the write to succeed.
//   (b) `isBashWriteToCoda` now detects compound (`cd .coda && …`), subshell
//       (`(cd .coda && …)`), and here-doc (`cat > .coda/x <<EOF`) redirects,
//       plus `sh -c`/`bash -c` wrappers (one level deep).
//   (c) Custom (non-built-in) tool_calls default-deny when their input payload
//       references `.coda/`; `coda_*` toolNames are allow-listed because
//       coda_* IS the approved mutation path. Rationale: Pi extension authors
//       may register mutation tools whose shape we don't know. Conservative
//       default-deny with an explicit allow-list enforces "the gate trusts
//       explicit intent, not coincidental absence".
// ──────────────────────────────────────────────────────────────────────────
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
        const bootstrap = buildBootstrapContext({ hasStateFile: existsSync(statePath) });
        return {
          systemPrompt: bootstrap.systemPrompt,
          message: {
            customType: 'coda-context',
            content: bootstrap.context,
            display: true,
            details: {
              focusIssue: state?.focus_issue ?? undefined,
              phase: state?.phase ?? undefined,
              submode: state?.submode ?? undefined,
              loopIteration: state?.loop_iteration ?? undefined,
              currentTask: state?.current_task ?? undefined,
            },
          },
        };
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
    const debugCoda = typeof process !== 'undefined' && process.env.DEBUG?.includes('coda:');
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
      const result = evaluateWriteGate('write', event.input.path, codaRoot, ctx.cwd, stateProvider);
      if (debugCoda && 'block' in result) {
        logWriteGateDecision('write', event.input.path, result);
      }
      return result;
    }
    if (isToolCallEventType('edit', event)) {
      const result = evaluateWriteGate('edit', event.input.path, codaRoot, ctx.cwd, stateProvider);
      if (debugCoda && 'block' in result) {
        logWriteGateDecision('edit', event.input.path, result);
      }
      return result;
    }

    // Non-built-in tool_calls (read/grep/find/ls/custom) reach this branch.
    // Built-in non-mutating tools (read/grep/find/ls) pass through naturally
    // because they do not match the `.coda/` pattern in their input payload.
    // Custom (extension-registered) tools default-deny if their input mentions `.coda/`,
    // with `coda_*` allow-listed because coda_* IS the approved mutation path.
    const toolName = event.toolName;
    if (typeof toolName === 'string' && !toolName.startsWith('coda_')) {
      if (inputReferencesCoda(event.input)) {
        const blockResult = {
          block: true as const,
          reason: 'Use coda_* tools to modify .coda/ files',
        };
        if (debugCoda) {
          logWriteGateDecision('custom', JSON.stringify(event.input).slice(0, 200), blockResult);
        }
        return blockResult;
      }
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

function buildBootstrapContext(options: { hasStateFile: boolean }): { systemPrompt: string; context: string } {
  const entryLine = options.hasStateFile
    ? 'Create the requested issue with coda_create, then focus it with coda_focus before changing production code.'
    : 'If CODA is not initialized, run coda_forge first. Then create the requested issue with coda_create and focus it with coda_focus before changing production code.';
  const lifecycleRule = 'Do not build code before an issue exists and is focused.'; const sourceRule = 'Do not read CODA source unless the injected guidance is insufficient.';
  const toolManifest = 'Tool manifest: coda_forge, coda_create, coda_focus, coda_status.'; const example = 'Example: "add X" → coda_create(...) → coda_focus(...).';
  return {
    systemPrompt: ['You are entering CODA from an unfocused workspace.', entryLine, lifecycleRule, toolManifest, 'Use coda_status whenever you need to confirm the next lifecycle step.', sourceRule, example].join(' '),
    context: ['## CODA Bootstrap', entryLine, toolManifest, 'Lifecycle overview: initialize CODA if needed, create the issue, focus it, then follow the prompted lifecycle phase before writing production code.', example, lifecycleRule, sourceRule].join('\n'),
  };
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

function logWriteGateDecision(
  operation: 'write' | 'edit' | 'custom',
  path: string,
  result: { block?: boolean; reason?: string }
): void {
  console.log(JSON.stringify({
    component: 'coda:write-gate',
    operation,
    path,
    outcome: result.block ? 'block' : 'allow',
    reason: result.reason,
  }));
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

/**
 * Return whether a write targets `.coda/` directly, by absolute path, OR via
 * a symlinked parent directory.
 *
 * Resolution strategy:
 * 1. Lexical pre-check catches obvious `.coda/` prefixes without filesystem IO.
 * 2. Parent-directory realpath catches parent-dir symlinks (`link-dir/→.coda/`)
 *    even when the target file does not exist yet. Leaf realpath would throw
 *    ENOENT on pre-write paths; parent-dir realpath is the sound invariant
 *    because the parent MUST exist for the write to succeed.
 * 3. TOCTOU boundary: Pi's `tool_call` fires at write time, so a symlink
 *    created after this check can only be exploited on a subsequent
 *    `tool_call`, which re-runs the check. Not our problem.
 */
function isProtectedCodaPath(path: string, codaRoot: string, cwd: string): boolean {
  if (path.startsWith('.coda/') || path.startsWith('.coda\\')) {
    return true;
  }

  const absolute = resolve(cwd, path);
  // Strategy:
  //   Resolve the LEAF first (realpath on the full path). If it exists and is a
  //   symlink, this catches the leaf-symlink case (`link-to-state.json → .coda/state.json`).
  //   If the leaf doesn't exist (typical pre-write case), fall back to resolving
  //   the PARENT and rejoin the basename — this catches parent-dir symlinks
  //   (`link-dir/state.json` where `link-dir → .coda`).
  let effectivePath: string;
  try {
    effectivePath = realpathSync(absolute);
  } catch {
    const absoluteParent = dirname(absolute);
    let resolvedParent: string;
    try {
      resolvedParent = realpathSync(absoluteParent);
    } catch {
      resolvedParent = absoluteParent;
    }
    effectivePath = join(resolvedParent, basename(absolute));
  }

  let resolvedCodaRoot: string;
  try {
    resolvedCodaRoot = realpathSync(resolve(codaRoot));
  } catch {
    resolvedCodaRoot = resolve(codaRoot);
  }

  return effectivePath === resolvedCodaRoot
    || effectivePath.startsWith(`${resolvedCodaRoot}${sep}`);
}

function formatCodaError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  return `CODA error: ${message}`;
}

// `isBashWriteToCoda` and `inputReferencesCoda` are imported from `./write-gate-perimeter`
// (extracted to keep this file under the RUBY soft threshold).
