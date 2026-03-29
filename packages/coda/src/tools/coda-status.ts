/**
 * @module tools/coda-status
 * Return a current state snapshot with human-readable guidance.
 *
 * Reads state.json and computes a next_action suggestion
 * based on the current lifecycle phase.
 */
import { loadState, readRecord } from '@coda/core';
import type { IssueRecord, PlanRecord } from '@coda/core';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
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
      current_task: null,
      completed_tasks: [],
      tdd_gate: 'locked',
      human_review_required: null,
      human_review_status: null,
      next_action: 'No state found — run coda forge to initialize',
    };
  }

  const reviewState = state.focus_issue && codaRoot
    ? loadHumanReviewState(codaRoot, state.focus_issue)
    : null;

  return {
    success: true,
    focus_issue: state.focus_issue,
    phase: state.phase,
    current_task: state.current_task,
    completed_tasks: state.completed_tasks,
    tdd_gate: state.tdd_gate,
    human_review_required: reviewState?.required ?? null,
    human_review_status: reviewState?.status ?? null,
    next_action: getNextAction(state.phase, reviewState),
  };
}

function getNextAction(
  phase: string | null,
  reviewState: { required: boolean; status: PlanRecord['human_review_status'] | null } | null
): string {
  if (phase === 'review' && reviewState?.required === true) {
    if (reviewState.status === 'pending') {
      return 'Human review required — approve the plan to advance or request changes with feedback';
    }

    if (reviewState.status === 'changes-requested') {
      return 'Human changes requested — revise the plan using the recorded feedback before re-review';
    }
  }

  if (!phase) {
    return 'Focus an issue to begin';
  }

  return NEXT_ACTIONS[phase] ?? 'Unknown phase';
}

function loadHumanReviewState(
  codaRoot: string,
  issueSlug: string
): { required: boolean; status: PlanRecord['human_review_status'] | null } | null {
  const issuePath = join(codaRoot, 'issues', `${issueSlug}.md`);
  const issueDir = join(codaRoot, 'issues', issueSlug);

  if (!existsSync(issuePath) || !existsSync(issueDir)) {
    return null;
  }

  const issue = readRecord<IssueRecord>(issuePath);
  const planFiles = readdirSync(issueDir)
    .filter((file) => file.startsWith('plan-v') && file.endsWith('.md'))
    .sort();
  const planFile = planFiles[planFiles.length - 1];

  if (!planFile) {
    return {
      required: issue.frontmatter.human_review,
      status: null,
    };
  }

  const plan = readRecord<PlanRecord>(join(issueDir, planFile));
  return {
    required: issue.frontmatter.human_review,
    status: plan.frontmatter.human_review_status,
  };
}
