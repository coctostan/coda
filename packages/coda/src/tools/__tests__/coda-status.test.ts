import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { codaStatus } from '../coda-status';
import { persistState, createDefaultState, writeRecord } from '@coda/core';
import type { CodaState, IssueRecord, PlanRecord } from '@coda/core';

let tempDir: string;
let statePath: string;
let codaRoot: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'coda-status-'));
  codaRoot = join(tempDir, '.coda');
  statePath = join(codaRoot, 'state.json');
  mkdirSync(codaRoot, { recursive: true });
  mkdirSync(join(codaRoot, 'issues'), { recursive: true });
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

function writePendingHumanReviewState(): void {
  const issueFrontmatter: IssueRecord = {
    title: 'My Issue',
    issue_type: 'feature',
    status: 'active',
    phase: 'review',
    priority: 3,
    topics: [],
    acceptance_criteria: [{ id: 'AC-1', text: 'Criterion 1', status: 'pending' }],
    open_questions: [],
    deferred_items: [],
    human_review: true,
  };

  const planFrontmatter: PlanRecord = {
    title: 'Implementation Plan',
    issue: 'my-issue',
    status: 'approved',
    iteration: 1,
    task_count: 0,
    human_review_status: 'pending',
  };

  writeRecord(join(codaRoot, 'issues', 'my-issue.md'), issueFrontmatter, '## Description\nNeeds approval.\n');
  writeRecord(join(codaRoot, 'issues', 'my-issue', 'plan-v1.md'), planFrontmatter, '## Approach\nWait for human review.\n');

  const state: CodaState = {
    ...createDefaultState(),
    focus_issue: 'my-issue',
    phase: 'review',
    submode: 'review',
  };
  persistState(state, statePath);
}

function writeReviseReviewState(): void {
  writeRecord(join(codaRoot, 'issues', 'my-issue.md'), {
    title: 'My Issue',
    issue_type: 'feature',
    status: 'active',
    phase: 'review',
    priority: 3,
    topics: [],
    acceptance_criteria: [{ id: 'AC-1', text: 'Criterion 1', status: 'pending' }],
    open_questions: [],
    deferred_items: [],
    human_review: false,
  } as IssueRecord, '## Description\nRevision required.\n');

  writeRecord(join(codaRoot, 'issues', 'my-issue', 'plan-v1.md'), {
    title: 'Implementation Plan',
    issue: 'my-issue',
    status: 'in-review',
    iteration: 2,
    task_count: 2,
    human_review_status: 'changes-requested',
  } as PlanRecord, '## Approach\nRevise the plan.\n');

  writeFileSync(
    join(codaRoot, 'issues', 'my-issue', 'revision-instructions.md'),
    '---\niteration: 2\nissues_found: 1\n---\n## Issue 1: revise the plan\n**Fix:** update the task order.\n',
    'utf-8'
  );

  persistState({
    ...createDefaultState(),
    focus_issue: 'my-issue',
    phase: 'review',
    submode: 'revise',
    loop_iteration: 2,
  }, statePath);
}

function writeCorrectVerifyState(): void {
  writeRecord(join(codaRoot, 'issues', 'my-issue.md'), {
    title: 'My Issue',
    issue_type: 'feature',
    status: 'active',
    phase: 'verify',
    priority: 3,
    topics: [],
    acceptance_criteria: [{ id: 'AC-1', text: 'Criterion 1', status: 'not-met' }],
    open_questions: [],
    deferred_items: [],
    human_review: false,
  } as IssueRecord, '## Description\nCorrection required.\n');

  writeRecord(join(codaRoot, 'issues', 'my-issue', 'plan-v1.md'), {
    title: 'Implementation Plan',
    issue: 'my-issue',
    status: 'approved',
    iteration: 1,
    task_count: 3,
    human_review_status: 'approved',
  } as PlanRecord, '## Approach\nCorrection flow.\n');

  mkdirSync(join(codaRoot, 'issues', 'my-issue', 'verification-failures'), { recursive: true });
  writeFileSync(
    join(codaRoot, 'issues', 'my-issue', 'verification-failures', 'AC-1.yaml'),
    'ac_id: AC-1\nstatus: not-met\nfailed_checks:\n  - type: test_failure\n    detail: regression still fails\nsource_tasks: [1]\nrelevant_files:\n  - src/workflow.ts\n',
    'utf-8'
  );

  persistState({
    ...createDefaultState(),
    focus_issue: 'my-issue',
    phase: 'verify',
    submode: 'correct',
    loop_iteration: 1,
    current_task: 3,
    completed_tasks: [1, 2],
  }, statePath);
}

function writeExhaustedReviewState(): void {
  writeRecord(join(codaRoot, 'issues', 'my-issue.md'), {
    title: 'My Issue',
    issue_type: 'feature',
    status: 'active',
    phase: 'review',
    priority: 3,
    topics: [],
    acceptance_criteria: [{ id: 'AC-1', text: 'Criterion 1', status: 'pending' }],
    open_questions: [],
    deferred_items: [],
    human_review: false,
  } as IssueRecord, '## Description\nReview exhausted.\n');

  writeRecord(join(codaRoot, 'issues', 'my-issue', 'plan-v1.md'), {
    title: 'Implementation Plan',
    issue: 'my-issue',
    status: 'in-review',
    iteration: 1,
    task_count: 0,
    human_review_status: 'not-required',
  } as PlanRecord, '## Approach\nAwait manual review decision.\n');

  writeRecord(join(codaRoot, 'issues', 'my-issue', 'revision-instructions.md'), {
    iteration: 3,
    issues_found: 1,
  }, '## Issue 1: unresolved\nStill missing AC coverage.\n**Fix:** provide human guidance.\n');

  writeFileSync(join(codaRoot, 'coda.json'), JSON.stringify({ max_review_iterations: 3 }, null, 2));
  persistState({
    ...createDefaultState(),
    focus_issue: 'my-issue',
    phase: 'review',
    submode: 'revise',
    loop_iteration: 3,
  }, statePath);
}

function writeExhaustedVerifyState(): void {
  writeRecord(join(codaRoot, 'issues', 'my-issue.md'), {
    title: 'My Issue',
    issue_type: 'feature',
    status: 'active',
    phase: 'verify',
    priority: 3,
    topics: [],
    acceptance_criteria: [{ id: 'AC-1', text: 'Criterion 1', status: 'not-met' }],
    open_questions: [],
    deferred_items: [],
    human_review: false,
  } as IssueRecord, '## Description\nVerify exhausted.\n');

  mkdirSync(join(codaRoot, 'issues', 'my-issue', 'verification-failures'), { recursive: true });
  writeFileSync(
    join(codaRoot, 'issues', 'my-issue', 'verification-failures', 'AC-1.yaml'),
    'ac_id: AC-1\nstatus: not-met\nfailed_checks:\n  - type: test_failure\n    detail: regression still fails\nsource_tasks: [1]\nrelevant_files:\n  - src/workflow.ts\n',
    'utf-8'
  );

  writeFileSync(join(codaRoot, 'coda.json'), JSON.stringify({ max_verify_iterations: 3 }, null, 2));
  persistState({
    ...createDefaultState(),
    focus_issue: 'my-issue',
    phase: 'verify',
    submode: 'correct',
    loop_iteration: 3,
  }, statePath);
}

describe('codaStatus', () => {
  test('returns current state fields when state exists', () => {
    const state: CodaState = {
      ...createDefaultState(),
      focus_issue: 'my-issue',
      phase: 'build',
      current_task: 2,
      completed_tasks: [1],
      tdd_gate: 'unlocked',
    };
    persistState(state, statePath);

    const result = codaStatus(statePath);

    expect(result.success).toBe(true);
    expect(result.focus_issue).toBe('my-issue');
    expect(result.phase).toBe('build');
    expect(result.current_task).toBe(2);
    expect(result.completed_tasks).toEqual([1]);
    expect(result.tdd_gate).toBe('unlocked');
  });

  test('returns null fields when no state exists', () => {
    const result = codaStatus(join(tempDir, 'nonexistent.json'));

    expect(result.success).toBe(true);
    expect(result.focus_issue).toBeNull();
    expect(result.phase).toBeNull();
    expect(result.next_action).toContain('initialize');
  });

  test('next_action suggests appropriate action for specify phase', () => {
    const state: CodaState = { ...createDefaultState(), focus_issue: 'x', phase: 'specify' };
    persistState(state, statePath);

    const result = codaStatus(statePath);
    expect(result.next_action.toLowerCase()).toContain('acceptance criteria');
  });

  test('next_action suggests appropriate action for build phase', () => {
    const state: CodaState = { ...createDefaultState(), focus_issue: 'x', phase: 'build' };
    persistState(state, statePath);

    const result = codaStatus(statePath);
    expect(result.next_action.toLowerCase()).toContain('task');
  });

  test('next_action for done phase', () => {
    const state: CodaState = { ...createDefaultState(), focus_issue: 'x', phase: 'done' };
    persistState(state, statePath);

    const result = codaStatus(statePath);
    expect(result.next_action.toLowerCase()).toContain('complete');
  });

  test('surfaces human-review-specific guidance while approval is pending', () => {
    writePendingHumanReviewState();

    const result = codaStatus(statePath, codaRoot);

    expect(result.success).toBe(true);
    expect(result.human_review_required).toBe(true);
    expect(result.human_review_status).toBe('pending');
    expect(result.next_action.toLowerCase()).toContain('approve');
    expect(result.next_action.toLowerCase()).toContain('feedback');
  });

  test('returns submode metadata and revise guidance for revise flows', () => {
    writeReviseReviewState();

    const result = codaStatus(statePath, codaRoot);

    expect(result.submode).toBe('revise');
    expect(result.loop_iteration).toBe(2);
    expect(result.next_action.toLowerCase()).toContain('revision');
    expect(result.next_action.toLowerCase()).toContain('review');
  });


  test('surfaces exhausted review guidance with approve and kill options', () => {
    writeExhaustedReviewState();

    const result = codaStatus(statePath, codaRoot);

    expect(result.next_action.toLowerCase()).toContain('provide guidance');
    expect(result.next_action.toLowerCase()).toContain('approve');
    expect(result.next_action.toLowerCase()).toContain('kill');
  });

  test('surfaces exhausted verify guidance with back and kill options', () => {
    writeExhaustedVerifyState();

    const result = codaStatus(statePath, codaRoot);

    expect(result.next_action.toLowerCase()).toContain('manual');
    expect(result.next_action.toLowerCase()).toContain('back');
    expect(result.next_action.toLowerCase()).toContain('kill');
  });

  test('returns correction-specific guidance for correct submode', () => {
    writeCorrectVerifyState();

    const result = codaStatus(statePath, codaRoot);

    expect(result.submode).toBe('correct');
    expect(result.loop_iteration).toBe(1);
    expect(result.current_task).toBe(3);
    expect(result.next_action.toLowerCase()).toContain('correction');
    expect(result.next_action.toLowerCase()).toContain('verify');
  });
});
