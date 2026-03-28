/**
 * @module tools/coda-status
 * Return a current state snapshot with human-readable guidance.
 *
 * Reads state.json and computes a next_action suggestion
 * based on the current lifecycle phase.
 */

import { loadState } from '@coda/core';
import type { StatusResult } from './types';

/** Phase-specific next action suggestions. */
const NEXT_ACTIONS: Record<string, string> = {
  specify: 'Define acceptance criteria, then advance to plan',
  plan: 'Create a plan, then advance to review',
  review: 'Review and approve the plan, then advance to build',
  build: 'Complete tasks, then advance to verify',
  verify: 'Verify all ACs met, then advance to unify',
  unify: 'Create completion record, then advance to done',
  done: 'Issue complete',
};

/**
 * Return the current CODA state snapshot.
 *
 * Reads state.json and returns all relevant fields plus
 * a human-readable next_action suggestion based on the current phase.
 *
 * @param statePath - Path to state.json
 * @returns StatusResult with current state and guidance
 */
export function codaStatus(statePath: string): StatusResult {
  const state = loadState(statePath);

  if (!state) {
    return {
      success: true,
      focus_issue: null,
      phase: null,
      current_task: null,
      completed_tasks: [],
      tdd_gate: 'locked',
      next_action: 'No state found — run coda forge to initialize',
    };
  }

  const next_action = state.phase
    ? (NEXT_ACTIONS[state.phase] ?? 'Unknown phase')
    : 'Focus an issue to begin';

  return {
    success: true,
    focus_issue: state.focus_issue,
    phase: state.phase,
    current_task: state.current_task,
    completed_tasks: state.completed_tasks,
    tdd_gate: state.tdd_gate,
    next_action,
  };
}
