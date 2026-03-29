import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync } from 'fs';
import { basename, join } from 'path';
import { tmpdir } from 'os';
import { codaAdvance } from '../coda-advance';
import { codaCreate } from '../coda-create';
import { readRecord, persistState, createDefaultState, writeRecord, loadState } from '@coda/core';
import type { CodaState, IssueRecord, PlanRecord } from '@coda/core';

let codaRoot: string;
let statePath: string;

beforeEach(() => {
  codaRoot = mkdtempSync(join(tmpdir(), 'coda-advance-'));
  statePath = join(codaRoot, 'state.json');
});

afterEach(() => {
  rmSync(codaRoot, { recursive: true, force: true });
});

/** Helper to create a focused issue with ACs and set up state. */
function setupIssue(acCount: number = 2): string {
  const acs = Array.from({ length: acCount }, (_, i) => ({
    id: `AC-${String(i + 1)}`,
    text: `Criterion ${String(i + 1)}`,
    status: 'pending',
  }));

  const result = codaCreate(
    {
      type: 'issue',
      fields: {
        title: 'Test Issue',
        issue_type: 'feature',
        status: 'proposed',
        phase: 'specify',
        priority: 3,
        topics: [],
        acceptance_criteria: acs,
        open_questions: [],
        deferred_items: [],
        human_review: false,
      },
    },
    codaRoot
  );

  const state: CodaState = {
    ...createDefaultState(),
    focus_issue: 'test-issue',
    phase: 'specify',
  };
  persistState(state, statePath);

  return result.path;
}

function setupPendingHumanReview(): string {
  codaCreate(
    {
      type: 'issue',
      fields: {
        title: 'Test Issue',
        issue_type: 'feature',
        status: 'active',
        phase: 'review',
        priority: 3,
        topics: [],
        acceptance_criteria: [{ id: 'AC-1', text: 'Criterion 1', status: 'pending' }],
        open_questions: [],
        deferred_items: [],
        human_review: true,
      },
    },
    codaRoot
  );

  const planPath = join(codaRoot, 'issues', 'test-issue', 'plan-v1.md');
  writeRecord<PlanRecord>(planPath, {
    title: 'Implementation Plan',
    issue: 'test-issue',
    status: 'approved',
    iteration: 1,
    task_count: 0,
    human_review_status: 'pending',
  }, '## Approach\nShip the approved plan.\n');

  persistState({
    ...createDefaultState(),
    focus_issue: 'test-issue',
    phase: 'review',
    submode: 'review',
    loop_iteration: 2,
  }, statePath);

  return planPath;
}

function setupExhaustedReview(): string {
  codaCreate(
    {
      type: 'issue',
      fields: {
        title: 'Test Issue',
        issue_type: 'feature',
        status: 'active',
        phase: 'review',
        priority: 3,
        topics: [],
        acceptance_criteria: [{ id: 'AC-1', text: 'Criterion 1', status: 'pending' }],
        open_questions: [],
        deferred_items: [],
        human_review: false,
      },
    },
    codaRoot
  );

  const planPath = join(codaRoot, 'issues', 'test-issue', 'plan-v1.md');
  writeRecord<PlanRecord>(planPath, {
    title: 'Implementation Plan',
    issue: 'test-issue',
    status: 'in-review',
    iteration: 1,
    task_count: 0,
    human_review_status: 'not-required',
  }, '## Approach\nHuman will approve after exhaustion.\n');

  persistState({
    ...createDefaultState(),
    focus_issue: 'test-issue',
    phase: 'review',
    submode: 'revise',
    loop_iteration: 3,
  }, statePath);

  return planPath;
}

function setupExhaustedVerify(): void {
  codaCreate(
    {
      type: 'issue',
      fields: {
        title: 'Test Issue',
        issue_type: 'feature',
        status: 'active',
        phase: 'verify',
        priority: 3,
        topics: [],
        acceptance_criteria: [{ id: 'AC-1', text: 'Criterion 1', status: 'not-met' }],
        open_questions: [],
        deferred_items: [],
        human_review: false,
      },
    },
    codaRoot
  );

  persistState({
    ...createDefaultState(),
    focus_issue: 'test-issue',
    phase: 'verify',
    submode: 'correct',
    loop_iteration: 3,
    current_task: 4,
    completed_tasks: [1, 2, 3],
  }, statePath);
}

describe('codaAdvance', () => {
  test('advance specify→plan with ACs succeeds', () => {
    setupIssue(2);

    const result = codaAdvance({ target_phase: 'plan' }, codaRoot, statePath);

    expect(result.success).toBe(true);
    expect(result.previous_phase).toBe('specify');
    expect(result.new_phase).toBe('plan');
  });

  test('updates issue phase in mdbase after successful advance', () => {
    const issuePath = setupIssue(2);

    codaAdvance({ target_phase: 'plan' }, codaRoot, statePath);

    const record = readRecord<Record<string, unknown>>(join(codaRoot, issuePath));
    expect(record.frontmatter['phase']).toBe('plan');
  });

  test('advance specify→plan without ACs fails with gate reason', () => {
    setupIssue(0);

    const result = codaAdvance({ target_phase: 'plan' }, codaRoot, statePath);

    expect(result.success).toBe(false);
    expect(result.reason).toContain('acceptance criterion');
  });

  test('does not modify data on failed advance', () => {
    const issuePath = setupIssue(0);

    codaAdvance({ target_phase: 'plan' }, codaRoot, statePath);

    const record = readRecord<Record<string, unknown>>(join(codaRoot, issuePath));
    expect(record.frontmatter['phase']).toBe('specify');
  });

  test('fails with invalid target phase', () => {
    setupIssue(2);

    const result = codaAdvance({ target_phase: 'build' }, codaRoot, statePath);

    expect(result.success).toBe(false);
    expect(result.reason).toBeDefined();
  });

  test('fails when no issue is focused', () => {
    persistState(createDefaultState(), statePath);

    const result = codaAdvance({ target_phase: 'specify' }, codaRoot, statePath);

    expect(result.success).toBe(false);
    expect(result.error).toContain('focus');
  });

  test('blocks review→build while human review is still pending', () => {
    setupPendingHumanReview();

    const result = codaAdvance({ target_phase: 'build' }, codaRoot, statePath);

    expect(result.success).toBe(false);
    expect(result.reason).toContain('Human plan review pending');
  });

  test('approves pending human review before advancing to build', () => {
    const planPath = setupPendingHumanReview();

    const result = codaAdvance({
      target_phase: 'build',
      human_review_decision: 'approved',
    }, codaRoot, statePath);

    expect(result.success).toBe(true);
    expect(result.previous_phase).toBe('review');
    expect(result.new_phase).toBe('build');

    const plan = readRecord<PlanRecord>(planPath);
    expect(plan.frontmatter.human_review_status).toBe('approved');

    const issue = readRecord<IssueRecord>(join(codaRoot, 'issues', 'test-issue.md'));
    expect(issue.frontmatter.phase).toBe('build');

    const state = loadState(statePath);
    expect(state?.phase).toBe('build');
    expect(state?.submode).toBeNull();
    expect(state?.loop_iteration).toBe(0);
  });

  test('records requested changes and returns the workflow to revise', () => {
    const planPath = setupPendingHumanReview();
    const reviewFeedback = 'Add a test scenario for approval rollback and tighten task scope.';

    const result = codaAdvance({
      target_phase: 'build',
      human_review_decision: 'changes-requested',
      review_feedback: reviewFeedback,
    }, codaRoot, statePath);

    expect(result.success).toBe(true);
    expect(result.previous_phase).toBe('review');
    expect(result.new_phase).toBe('review');

    const plan = readRecord<PlanRecord>(planPath);
    expect(plan.frontmatter.human_review_status).toBe('changes-requested');
    expect(plan.body).toContain('## Human Review');
    expect(plan.body).toContain(reviewFeedback);

    const state = loadState(statePath);
    expect(state?.phase).toBe('review');
    expect(state?.submode).toBe('revise');
    expect(state?.loop_iteration).toBe(0);

    expect(basename(planPath)).toBe('plan-v1.md');
  });


  test('manually approves an exhausted review loop into build', () => {
    const planPath = setupExhaustedReview();

    const result = codaAdvance({ target_phase: 'build' }, codaRoot, statePath);

    expect(result.success).toBe(true);
    expect(result.previous_phase).toBe('review');
    expect(result.new_phase).toBe('build');

    const plan = readRecord<PlanRecord>(planPath);
    expect(plan.frontmatter.status).toBe('approved');
    expect(plan.frontmatter.human_review_status).toBe('approved');

    const state = loadState(statePath);
    expect(state?.phase).toBe('build');
    expect(state?.submode).toBeNull();
    expect(state?.loop_iteration).toBe(0);
  });

  test('re-enters verify with loop reset when advance is used after verify exhaustion', () => {
    setupExhaustedVerify();

    const result = codaAdvance({ target_phase: 'unify' }, codaRoot, statePath);

    expect(result.success).toBe(true);
    expect(result.previous_phase).toBe('verify');
    expect(result.new_phase).toBe('verify');

    const issue = readRecord<IssueRecord>(join(codaRoot, 'issues', 'test-issue.md'));
    expect(issue.frontmatter.phase).toBe('verify');

    const state = loadState(statePath);
    expect(state?.phase).toBe('verify');
    expect(state?.submode).toBe('verify');
    expect(state?.loop_iteration).toBe(0);
    expect(state?.current_task).toBeNull();
    expect(state?.completed_tasks).toEqual([1, 2, 3]);
  });
});
