import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { createDefaultState, persistState, readRecord, writeRecord, loadState } from '@coda/core';
import type { IssueRecord, PlanRecord, TaskRecord } from '@coda/core';
import { codaBack } from '../coda-back';

let codaRoot: string;
let statePath: string;

beforeEach(() => {
  codaRoot = mkdtempSync(join(tmpdir(), 'coda-back-'));
  statePath = join(codaRoot, 'state.json');

  writeRecord(join(codaRoot, 'issues', 'test-issue.md'), {
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
  } as IssueRecord, '## Description\nReady to rewind.\n');

  writeRecord(join(codaRoot, 'issues', 'test-issue', 'plan-v1.md'), {
    title: 'Implementation Plan',
    issue: 'test-issue',
    status: 'approved',
    iteration: 1,
    task_count: 1,
    human_review_status: 'approved',
  } as PlanRecord, '## Approach\nShip the feature.\n');

  writeRecord(join(codaRoot, 'issues', 'test-issue', 'tasks', '01-ship-it.md'), {
    id: 1,
    issue: 'test-issue',
    title: 'Ship it',
    status: 'complete',
    kind: 'planned',
    covers_ac: ['AC-1'],
    depends_on: [],
    files_to_modify: ['src/feature.ts'],
    truths: ['Feature works'],
    artifacts: [],
    key_links: [],
  } as TaskRecord, '## Summary\nTask complete.\n');

  persistState({
    ...createDefaultState(),
    focus_issue: 'test-issue',
    phase: 'verify',
    submode: 'correct',
    loop_iteration: 2,
    current_task: 1,
    completed_tasks: [1],
  }, statePath);
});

afterEach(() => {
  rmSync(codaRoot, { recursive: true, force: true });
});

describe('codaBack', () => {
  test('rewinds to plan by superseding the current plan and preserving task artifacts', () => {
    const result = codaBack({ target_phase: 'plan' }, codaRoot, statePath);

    expect(result.success).toBe(true);
    expect(result.previous_phase).toBe('verify');
    expect(result.new_phase).toBe('plan');

    const issue = readRecord<IssueRecord>(join(codaRoot, 'issues', 'test-issue.md'));
    expect(issue.frontmatter.phase).toBe('plan');

    const plan = readRecord<PlanRecord>(join(codaRoot, 'issues', 'test-issue', 'plan-v1.md'));
    expect(plan.frontmatter.status).toBe('superseded');

    const task = readRecord<TaskRecord>(join(codaRoot, 'issues', 'test-issue', 'tasks', '01-ship-it.md'));
    expect(task.frontmatter.status).toBe('complete');

    const state = loadState(statePath);
    expect(state?.phase).toBe('plan');
    expect(state?.submode).toBeNull();
    expect(state?.loop_iteration).toBe(0);
    expect(state?.current_task).toBeNull();
    expect(state?.completed_tasks).toEqual([1]);
  });

  test('rewinds to review by reverting the plan to draft instead of superseding it', () => {
    const result = codaBack({ target_phase: 'review' }, codaRoot, statePath);

    expect(result.success).toBe(true);
    expect(result.new_phase).toBe('review');

    const plan = readRecord<PlanRecord>(join(codaRoot, 'issues', 'test-issue', 'plan-v1.md'));
    expect(plan.frontmatter.status).toBe('draft');

    const state = loadState(statePath);
    expect(state?.phase).toBe('review');
    expect(state?.submode).toBe('review');
    expect(state?.loop_iteration).toBe(0);
  });

  test('rejects rewinds to the same or a later phase', () => {
    const result = codaBack({ target_phase: 'verify' }, codaRoot, statePath);
    expect(result.success).toBe(false);
    expect(result.reason).toContain('prior phase');
  });
});
