import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, mkdirSync, rmSync } from 'fs';
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
});
