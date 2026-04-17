/**
 * @module tools/coda-status
 * Return a current state snapshot with human-readable guidance.
 *
 * Reads state.json and computes a next_action suggestion
 * based on the current lifecycle phase.
 */
import { loadState, readRecord } from '@coda/core';
import type { CodaState, CompletionRecord, IssueRecord, PlanRecord, TaskRecord } from '@coda/core';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { isLoopExhausted } from '../../../core/src/state/machine';
import type { LoopIterationConfig } from '../../../core/src/state/types';
import type { StatusResult } from './types';
import type { CodaConfig } from '../forge/types';
import { loadCodaConfig } from './coda-config';
import { getDefaultConfig } from '../forge';
import { resolveGateMode } from '../workflow/gate-automation';
import { sortByNumericSuffix } from './sort-utils';
import { findCompletionRecordPath } from './coda-advance';

const NO_STATE_ACTION = 'coda_forge — initialize CODA in this workspace before doing any lifecycle work.';
const UNFOCUSED_ACTION = 'coda_create — create the next issue, then coda_focus to begin its lifecycle before building code.';
/** Phase-specific next action suggestions. */
const NEXT_ACTIONS: Record<string, string> = {
  specify: 'Use coda_update / coda_edit_body to define the focused issue and acceptance criteria, then coda_advance to move into plan.',
  plan: 'Use coda_create / coda_edit_body to finish the plan and task breakdown, then coda_advance to move into review.',
  review: 'Use coda_read to inspect the plan and tasks, revise with coda_edit_body if needed, then coda_advance to move into build.',
  build: 'Use coda_read to inspect the active task, coda_update / coda_edit_body to complete it, coda_status between tasks, and coda_advance when build is complete.',
  verify: 'Use coda_read to inspect the issue, plan, and task summaries, verify each acceptance criterion, and coda_advance to move into unify when all ACs pass.',
  unify: 'UNIFY — The Compounding Step (5 mandatory actions): 1. Merge spec delta into ref-system.md, 2. Review and update other reference docs, 3. Capture knowledge for compounding, 4. Update milestone progress, 5. Write completion record. All 5 actions must complete before using coda_advance to move into DONE. The completion record must have: system_spec_updated, reference_docs_reviewed, milestone_updated all set to true.',
  done: 'Issue complete — use coda_create to start the next issue, then coda_focus to enter its lifecycle.',
};

/**
 * Return the current CODA state snapshot.
 *
 * Reads state.json and returns all relevant fields plus
 * a human-readable next_action suggestion based on the current phase.
 *
 * @param statePath - Path to state.json
 * @param codaRoot - Optional path to the `.coda/` directory for richer review guidance
 * @returns StatusResult with current state and guidance
 */
export function codaStatus(statePath: string, codaRoot?: string): StatusResult {
  const state = loadState(statePath);

  if (!state) {
    return {
      success: true,
      focus_issue: null,
      phase: null,
      submode: null,
      loop_iteration: 0,
      current_task: null,
      task_kind: null,
      task_title: null,
      completed_tasks: [],
      tdd_gate: 'locked',
      human_review_required: null,
      human_review_status: null,
      gate_mode: null,
      next_action: NO_STATE_ACTION,
    };
  }

  const reviewState = state.focus_issue && codaRoot
    ? loadHumanReviewState(codaRoot, state.focus_issue)
    : null;
  const exhausted = codaRoot ? isExhaustedState(codaRoot, state) : false;
  const unifyReviewStatus = state.focus_issue && codaRoot && state.phase === 'unify'
    ? loadUnifyReviewStatus(codaRoot, state.focus_issue)
    : null;
  const activeTask = state.focus_issue && codaRoot && state.current_task !== null
    ? loadActiveTask(codaRoot, state.focus_issue, state.current_task)
    : null;

  return {
    success: true,
    focus_issue: state.focus_issue,
    phase: state.phase,
    submode: state.submode,
    loop_iteration: state.loop_iteration,
    current_task: state.current_task,
    task_kind: activeTask?.kind ?? null,
    task_title: activeTask?.title ?? null,
    completed_tasks: state.completed_tasks,
    tdd_gate: state.tdd_gate,
    human_review_required: reviewState?.required ?? null,
    human_review_status: reviewState?.status ?? null,
    gate_mode: state.phase === 'review' ? reviewState?.gateMode ?? null : null,
    unify_review_status: unifyReviewStatus,
    next_action: getNextAction(state, reviewState, exhausted, unifyReviewStatus),
  };
}

function getNextAction(
  state: CodaState,
  reviewState: { required: boolean; status: PlanRecord['human_review_status'] | null; gateMode: string | null } | null,
  exhausted: boolean,
  unifyReviewStatus?: CompletionRecord['unify_review_status'] | null
): string {
  if (exhausted && state.phase === 'review') {
    return 'Review loop exhausted — provide guidance, approve with coda_advance to enter build, or kill the issue.';
  }
  if (exhausted && state.phase === 'verify') {
    return 'Verify loop exhausted — provide manual guidance, use /coda back specify to rescope, or kill the issue.';
  }
  if (state.phase === 'review' && state.submode === 'revise') {
    return 'Revision loop active — use coda_read to inspect the revision instructions, update the plan/tasks with coda_edit_body / coda_update, then coda_advance to return to review.';
  }
  if (state.phase === 'verify' && state.submode === 'correct') {
    return 'Correction loop active — use coda_read to inspect the correction task and failure artifact, complete the fix, then coda_advance to return to verify.';
  }
  if (state.phase === 'review' && reviewState?.required === true) {
    if (reviewState.status === 'pending') {
      return 'Human review required — approve the plan with coda_advance, or request changes with feedback.';
    }
    if (reviewState.status === 'changes-requested') {
      return 'Human changes requested — revise the plan with coda_edit_body / coda_update, then coda_advance to return to review.';
    }
  }
  if (state.phase === 'unify' && unifyReviewStatus === 'pending') {
    return 'UNIFY review pending — approve with coda_advance, or request changes with coda_advance changes <feedback>.';
  }
  if (state.phase === 'unify' && unifyReviewStatus === 'changes-requested') {
    return 'UNIFY review changes requested — address the completion-record feedback with coda_edit_body, then reset unify_review_status to pending.';
  }

  if (!state.focus_issue || !state.phase) {
    return UNFOCUSED_ACTION;
  }
  return NEXT_ACTIONS[state.phase] ?? 'Unknown phase';
}

function loadHumanReviewState(
  codaRoot: string,
  issueSlug: string
): { required: boolean; status: PlanRecord['human_review_status'] | null; gateMode: string | null } | null {
  const issuePath = join(codaRoot, 'issues', `${issueSlug}.md`);
  const issueDir = join(codaRoot, 'issues', issueSlug);

  if (!existsSync(issuePath) || !existsSync(issueDir)) {
    return null;
  }

  const issue = readRecord<IssueRecord>(issuePath);
  const planFiles = sortByNumericSuffix(
    readdirSync(issueDir)
      .filter((file) => file.startsWith('plan-v') && file.endsWith('.md'))
  );
  const planFile = planFiles[planFiles.length - 1];

  if (!planFile) {
    return {
      required: issue.frontmatter.human_review,
      status: null,
      gateMode: resolvePlanReviewGateMode(codaRoot, issue.frontmatter.issue_type),
    };
  }

  const plan = readRecord<PlanRecord>(join(issueDir, planFile));
  return {
    required: issue.frontmatter.human_review,
    status: plan.frontmatter.human_review_status,
    gateMode: resolvePlanReviewGateMode(codaRoot, issue.frontmatter.issue_type),
  };
}

function resolvePlanReviewGateMode(codaRoot: string, issueType?: string): string | null {
  return resolveGateMode('plan_review', issueType ?? 'feature', loadCodaConfig(codaRoot) ?? getDefaultConfig());
}

// `loadCodaConfig` is imported from `./coda-config` (Phase 55 dedupe).

function loadActiveTask(
  codaRoot: string,
  issueSlug: string,
  taskId: number
): { kind: TaskRecord['kind']; title: string } | null {
  const tasksDir = join(codaRoot, 'issues', issueSlug, 'tasks');
  if (!existsSync(tasksDir)) {
    return null;
  }

  try {
    const taskFile = readdirSync(tasksDir)
      .filter((file) => file.endsWith('.md'))
      .sort()
      .find((file) => readRecord<TaskRecord>(join(tasksDir, file)).frontmatter.id === taskId);

    if (!taskFile) {
      return null;
    }

    const task = readRecord<TaskRecord>(join(tasksDir, taskFile));
    return {
      kind: task.frontmatter.kind,
      title: task.frontmatter.title,
    };
  } catch {
    return null;
  }
}

function isExhaustedState(codaRoot: string, state: CodaState): boolean {
  return isLoopExhausted(state, loadLoopConfig(codaRoot));
}

function loadLoopConfig(codaRoot: string): LoopIterationConfig {
  const configPath = join(codaRoot, 'coda.json');
  if (!existsSync(configPath)) {
    return {};
  }

  try {
    return JSON.parse(readFileSync(configPath, 'utf-8')) as LoopIterationConfig;
  } catch {
    return {};
  }
}

/**
 * Load UNIFY review status from the completion record.
 */
function loadUnifyReviewStatus(
  codaRoot: string,
  issueSlug: string
): CompletionRecord['unify_review_status'] | null {
  const recordPath = findCompletionRecordPath(codaRoot, issueSlug);
  if (!recordPath) {
    return null;
  }

  try {
    const record = readRecord<CompletionRecord>(recordPath);
    return record.frontmatter.unify_review_status ?? null;
  } catch {
    return null;
  }
}