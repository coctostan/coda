/**
 * @module pi/hooks
 * Hook registration for the CODA Pi extension.
 *
 * Registers lifecycle hooks for state initialization, context injection,
 * and `.coda/` write protection.
 */

import { join, resolve, sep } from 'node:path';
import { loadState } from '@coda/core';
import { isToolCallEventType } from '@mariozechner/pi-coding-agent';
import type { ExtensionAPI } from '@mariozechner/pi-coding-agent';
import { checkWriteGate } from '../tools';
import { getPhaseContext } from '../workflow';
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
          phase: state.phase,
        },
      },
    };
  });

  pi.on('tool_call', async (event, ctx) => {
    if (isToolCallEventType('write', event)) {
      return evaluateWriteGate('write', event.input.path, codaRoot, ctx.cwd, stateProvider);
    }

    if (isToolCallEventType('edit', event)) {
      return evaluateWriteGate('edit', event.input.path, codaRoot, ctx.cwd, stateProvider);
    }

    return {};
  });
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

  const state = stateProvider.refreshState() ?? stateProvider.getState();
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

/** Return whether a write targets `.coda/` directly or by absolute path. */
function isProtectedCodaPath(path: string, codaRoot: string, cwd: string): boolean {
  if (path.startsWith('.coda/') || path.startsWith('.coda\\')) {
    return true;
  }

  const absolutePath = resolve(cwd, path);
  const absoluteCodaRoot = resolve(codaRoot);
  return absolutePath === absoluteCodaRoot || absolutePath.startsWith(`${absoluteCodaRoot}${sep}`);
}
