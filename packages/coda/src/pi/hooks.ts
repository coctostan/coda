/**
 * @module pi/hooks
 * Hook registration for the CODA Pi extension.
 *
 * Registers lifecycle hooks:
 * - before_agent_start: injects phase-specific context
 * - tool_call: enforces .coda/ write protection and TDD gate
 * - agent_end: signals BUILD loop completion
 */

import type { PiAPI, HookContext, HookResult, StateProvider } from './types';
import { getPhaseContext } from '../workflow';
import { checkWriteGate } from '../tools';

/**
 * Register all CODA lifecycle hooks with the Pi API.
 *
 * @param pi - The Pi extension API
 * @param codaRoot - Path to the `.coda/` directory
 * @param stateProvider - Provides access to current CODA state
 */
export function registerHooks(
  pi: PiAPI,
  codaRoot: string,
  stateProvider: StateProvider
): void {
  // before_agent_start: inject phase-specific context
  pi.on('before_agent_start', (_ctx: HookContext): HookResult => {
    const state = stateProvider.getState();
    if (!state?.focus_issue || !state?.phase) {
      return {};
    }

    const phaseContext = getPhaseContext(state.phase, codaRoot, state.focus_issue, state);

    return {
      systemPrompt: phaseContext.systemPrompt,
      message: phaseContext.context,
    };
  });

  // tool_call: enforce .coda/ write protection and TDD gate
  pi.on('tool_call', (ctx: HookContext): HookResult => {
    if (!ctx.tool) return {};

    const { name, args } = ctx.tool;
    const path = args['path'] as string | undefined;

    if (!path) return {};
    if (name !== 'write' && name !== 'edit') return {};

    // .coda/ write protection
    if (path.startsWith('.coda/') || path.startsWith('.coda\\')) {
      return {
        block: true,
        reason: 'Use coda_* tools to modify .coda/ files',
      };
    }

    // TDD write-gate
    const state = stateProvider.getState();
    if (state?.tdd_gate === 'locked') {
      const gateResult = checkWriteGate(
        { operation: name as 'write' | 'edit', path },
        { tdd_gate: state.tdd_gate }
      );
      if (!gateResult.allowed) {
        return {
          block: true,
          reason: gateResult.reason ?? 'TDD gate locked. Write a failing test first.',
        };
      }
    }

    return {};
  });

  // agent_end: signal BUILD loop completion
  pi.on('agent_end', (_ctx: HookContext): HookResult => {
    // In production, this resolves the build loop completion promise.
    // The actual resolver is set by the build loop at runtime.
    return {};
  });
}
