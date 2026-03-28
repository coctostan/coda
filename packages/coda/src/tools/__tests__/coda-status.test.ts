import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { codaStatus } from '../coda-status';
import { persistState, createDefaultState } from '@coda/core';
import type { CodaState } from '@coda/core';

let tempDir: string;
let statePath: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'coda-status-'));
  statePath = join(tempDir, 'state.json');
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

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
});
