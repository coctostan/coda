import { createDefaultState, loadState, persistState, readRecord } from '@coda/core';
import type { IssueRecord, Phase } from '@coda/core';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createBranch } from './vcs';

const NEXT_ACTIONS: Record<Phase, string> = {
  specify: 'Define acceptance criteria, then advance to plan',
  plan: 'Create a plan, then advance to review',
  review: 'Review and approve the plan, then advance to build',
  build: 'Complete tasks, then advance to verify',
  verify: 'Verify all ACs met, then advance to unify',
  unify: 'UNIFY — The Compounding Step (5 mandatory actions): 1. Merge spec delta into ref-system.md, 2. Review and update other reference docs, 3. Capture knowledge for compounding, 4. Update milestone progress, 5. Write completion record. All 5 actions must complete before advancing to DONE. The completion record must have: system_spec_updated, reference_docs_reviewed, milestone_updated all set to true.',
  done: 'Issue complete',
};

export interface FocusIssueOptions {
  createBranch?: boolean;
}

export interface FocusIssueFocusedResult {
  status: 'focused';
  slug: string;
  phase: Phase;
  branch?: string;
  branch_status: 'created' | 'existing' | 'skipped';
  reason?: 'create_branch=false' | 'not a git repo' | 'git error';
  next_action: string;
}

export interface FocusIssueAlreadyFocusedResult {
  status: 'already_focused';
  slug: string;
  phase: Phase | null;
  next_action: string;
}

export interface FocusIssueErrorResult {
  status: 'error';
  reason: string;
  next_action: string;
}

export type FocusIssueResult = FocusIssueFocusedResult | FocusIssueAlreadyFocusedResult | FocusIssueErrorResult;

export function focusIssue(
  codaRoot: string,
  projectRoot: string,
  slug: string,
  options: FocusIssueOptions = {}
): FocusIssueResult {
  try {
    const statePath = join(codaRoot, 'state.json');
    const issuePath = join(codaRoot, 'issues', `${slug}.md`);

    if (!existsSync(issuePath)) {
      return {
        status: 'error',
        reason: `Issue "${slug}" not found.`,
        next_action: 'Create the issue first with coda_create.',
      };
    }

    const currentState = loadState(statePath);
    if (currentState?.focus_issue === slug) {
      return {
        status: 'already_focused',
        slug,
        phase: currentState.phase,
        next_action: getNextAction(currentState.phase),
      };
    }

    const issueRecord = readRecord<IssueRecord>(issuePath);
    if (!isIssueFrontmatter(issueRecord.frontmatter)) {
      return {
        status: 'error',
        reason: `Issue "${slug}" is malformed.`,
        next_action: 'Fix the issue record frontmatter, then try again.',
      };
    }

    const issueType = typeof issueRecord.frontmatter.issue_type === 'string'
      ? issueRecord.frontmatter.issue_type
      : 'feature';
    const issuePhase = typeof issueRecord.frontmatter.phase === 'string'
      ? issueRecord.frontmatter.phase
      : 'specify';

    const state = currentState ?? createDefaultState();
    state.focus_issue = slug;
    state.phase = issuePhase;
    state.current_task = null;
    state.completed_tasks = [];
    persistState(state, statePath);

    if (options.createBranch === false) {
      return {
        status: 'focused',
        slug,
        phase: issuePhase,
        branch_status: 'skipped',
        reason: 'create_branch=false',
        next_action: getNextAction(issuePhase),
      };
    }

    try {
      const branchResult = createBranch(projectRoot, slug, issueType);
      return {
        status: 'focused',
        slug,
        phase: issuePhase,
        branch: branchResult.branch,
        branch_status: branchResult.created ? 'created' : 'existing',
        next_action: getNextAction(issuePhase),
      };
    } catch (err) {
      return {
        status: 'focused',
        slug,
        phase: issuePhase,
        branch_status: 'skipped',
        reason: classifyBranchFailure(err),
        next_action: getNextAction(issuePhase),
      };
    }
  } catch (err) {
    return {
      status: 'error',
      reason: err instanceof Error ? err.message : String(err),
      next_action: 'Fix the issue record, then try focusing it again.',
    };
  }
}

function getNextAction(phase: Phase | null): string {
  if (!phase) {
    return 'Focus an issue to begin';
  }

  return NEXT_ACTIONS[phase];
}

function isIssueFrontmatter(value: unknown): value is Partial<IssueRecord> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function classifyBranchFailure(err: unknown): 'not a git repo' | 'git error' {
  const message = getErrorText(err).toLowerCase();
  return message.includes('not a git repository') ? 'not a git repo' : 'git error';
}

function getErrorText(err: unknown): string {
  if (err instanceof Error) {
    const extra = readExecErrorStream(err, 'stderr') ?? readExecErrorStream(err, 'stdout');
    return extra ? `${err.message}\n${extra}` : err.message;
  }

  return String(err);
}

function readExecErrorStream(err: Error, key: 'stderr' | 'stdout'): string | null {
  const streamValue = Reflect.get(err, key);
  if (typeof streamValue === 'string') {
    return streamValue;
  }
  if (streamValue instanceof Uint8Array) {
    return Buffer.from(streamValue).toString('utf-8');
  }

  return null;
}
