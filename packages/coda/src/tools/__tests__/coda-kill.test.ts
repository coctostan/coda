import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { createDefaultState, persistState, readRecord, loadState, writeRecord } from '@coda/core';
import type { IssueRecord } from '@coda/core';
import { codaKill } from '../coda-kill';

let codaRoot: string;
let statePath: string;

beforeEach(() => {
  codaRoot = mkdtempSync(join(tmpdir(), 'coda-kill-'));
  statePath = join(codaRoot, 'state.json');

  writeRecord(join(codaRoot, 'issues', 'test-issue.md'), {
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
  } as IssueRecord, '## Description\nKill this issue.\n');

  persistState({
    ...createDefaultState(),
    focus_issue: 'test-issue',
    phase: 'review',
    submode: 'revise',
    loop_iteration: 2,
    current_task: 3,
    completed_tasks: [1, 2],
  }, statePath);
});

afterEach(() => {
  rmSync(codaRoot, { recursive: true, force: true });
});

describe('codaKill', () => {
  test('marks the focused issue as wont-fix and clears active runtime state', () => {
    const result = codaKill(codaRoot, statePath);

    expect(result.success).toBe(true);
    expect(result.previous_phase).toBe('review');
    expect(result.new_phase).toBe('done');

    const issue = readRecord<IssueRecord>(join(codaRoot, 'issues', 'test-issue.md'));
    expect(issue.frontmatter.status).toBe('wont-fix');
    expect(issue.frontmatter.phase).toBe('done');

    const state = loadState(statePath);
    expect(state?.focus_issue).toBeNull();
    expect(state?.phase).toBeNull();
    expect(state?.submode).toBeNull();
    expect(state?.current_task).toBeNull();
    expect(state?.completed_tasks).toEqual([]);
  });

  test('fails cleanly when there is no focused issue', () => {
    persistState(createDefaultState(), statePath);

    const result = codaKill(codaRoot, statePath);
    expect(result.success).toBe(false);
    expect(result.error).toContain('focus issue');
  });
});
