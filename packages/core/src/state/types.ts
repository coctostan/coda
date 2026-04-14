/**
 * @module state/types
 * Type definitions for the CODA state engine.
 *
 * The state engine tracks where an issue is in its lifecycle,
 * enforces valid phase transitions via gates, and persists
 * state atomically to JSON.
 */

/** The 7 lifecycle phases an issue moves through, in order. */
export type Phase = 'specify' | 'plan' | 'review' | 'build' | 'verify' | 'unify' | 'done';

/** Review/verify submodes introduced in v0.2 autonomous loops. */
export type Submode = 'review' | 'revise' | 'verify' | 'correct';

/** Ordered list of all phases for transition validation. */
export const PHASE_ORDER: readonly Phase[] = [
  'specify',
  'plan',
  'review',
  'build',
  'verify',
  'unify',
  'done',
] as const;

/**
 * Runtime-configurable loop limits used by review/verify autonomous cycles.
 */
export interface LoopIterationConfig {
  /** Maximum number of review/revise loop iterations before exhaustion. */
  max_review_iterations?: number;
  /** Maximum number of verify/correct loop iterations before exhaustion. */
  max_verify_iterations?: number;
}

/**
 * The runtime state of a CODA-managed project.
 * Tracks the current position in the issue lifecycle.
 */
export interface CodaState {
  /** Schema version — still 1 for the current persisted state shape family. */
  version: 1;
  /** Active issue slug, or null if no issue is focused. */
  focus_issue: string | null;
  /** Current lifecycle phase, or null if not yet started. */
  phase: Phase | null;
  /** Active submode within review/verify, otherwise null. */
  submode: Submode | null;
  /** Current autonomous loop iteration count for review/verify. */
  loop_iteration: number;
  /** Active task number during BUILD phase. */
  current_task: number | null;
  /** Task numbers that have been completed. */
  completed_tasks: number[];
  /** TDD write-gate state: locked prevents production writes without failing tests. */
  tdd_gate: 'locked' | 'unlocked';
  /** Exit code from the last test run. */
  last_test_exit_code: number | null;
  /** Count of tool calls in current task (for stuck detection). */
  task_tool_calls: number;
  /** Master on/off switch for CODA. */
  enabled: boolean;
}

/**
 * A gate that validates whether a phase transition is allowed.
 * Gates are checked before each transition and can block with a reason.
 */
export interface Gate {
  /** Human-readable name for the gate. */
  name: string;
  /** Check function — returns whether the transition is allowed. */
  check: (data: GateCheckData) => { passed: boolean; reason?: string };
}

/**
 * Data provided to gate check functions for transition validation.
 * Each field is optional — gates only inspect the fields they care about.
 */
export interface GateCheckData {
  /** Number of acceptance criteria on the issue. */
  issueAcCount?: number;
  /** Whether a plan exists for the issue. */
  planExists?: boolean;
  /** Whether the plan has been approved. */
  planApproved?: boolean;
  /** Whether all planned tasks are complete. */
  allPlannedTasksComplete?: boolean;
  /** Whether all acceptance criteria are met. */
  allAcsMet?: boolean;
  /** Whether a completion record exists. */
  completionRecordExists?: boolean;
  /** Whether human review is required before entering BUILD. */
  humanReviewRequired?: boolean;
  /** Current human review status for the plan. */
  humanReviewStatus?: string;
  /** Count of module findings exceeding block threshold. 0 or undefined means no blocks. */
  moduleBlockFindings?: number;
  /** Whether the system spec (ref-system.md) was updated or confirmed no change needed. */
  systemSpecUpdated?: boolean;
  /** Whether reference docs were reviewed for updates. */
  referenceDocsReviewed?: boolean;
  /** Whether milestone progress was updated (or confirmed no milestone). */
  milestoneUpdated?: boolean;
}

/** Result of a phase transition attempt. */
export interface TransitionResult {
  /** Whether the transition succeeded. */
  success: boolean;
  /** Updated state (only present on success). */
  state?: CodaState;
  /** Error message (only present on failure). */
  error?: string;
}

/**
 * Create a default initial CodaState.
 *
 * @returns A new CodaState with version 1, no focus issue, no phase,
 *          no submode, loop_iteration 0, TDD gate locked, and enabled.
 */
export function createDefaultState(): CodaState {
  return {
    version: 1,
    focus_issue: null,
    phase: null,
    submode: null,
    loop_iteration: 0,
    current_task: null,
    completed_tasks: [],
    tdd_gate: 'locked',
    last_test_exit_code: null,
    task_tool_calls: 0,
    enabled: true,
  };
}
