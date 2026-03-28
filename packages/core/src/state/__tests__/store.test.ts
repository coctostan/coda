import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { persistState, loadState } from '../store';
import { createDefaultState } from '../types';
import type { CodaState } from '../types';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'coda-store-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe('persistState', () => {
  test('writes state that can be loaded back identically', () => {
    const statePath = join(tempDir, 'state.json');
    const state: CodaState = {
      ...createDefaultState(),
      focus_issue: 'test-issue',
      phase: 'build',
      current_task: 2,
      completed_tasks: [1],
      tdd_gate: 'unlocked',
      last_test_exit_code: 0,
      task_tool_calls: 15,
    };

    persistState(state, statePath);

    const loaded = loadState(statePath);
    expect(loaded).not.toBeNull();
    expect(loaded?.version).toBe(1);
    expect(loaded?.focus_issue).toBe('test-issue');
    expect(loaded?.phase).toBe('build');
    expect(loaded?.current_task).toBe(2);
    expect(loaded?.completed_tasks).toEqual([1]);
    expect(loaded?.tdd_gate).toBe('unlocked');
    expect(loaded?.last_test_exit_code).toBe(0);
    expect(loaded?.task_tool_calls).toBe(15);
    expect(loaded?.enabled).toBe(true);
  });

  test('cleans up .tmp file after successful write', () => {
    const statePath = join(tempDir, 'state.json');
    persistState(createDefaultState(), statePath);

    expect(existsSync(statePath)).toBe(true);
    expect(existsSync(statePath + '.tmp')).toBe(false);
  });

  test('overwrites existing state file', () => {
    const statePath = join(tempDir, 'state.json');
    const state1 = { ...createDefaultState(), focus_issue: 'first' };
    const state2 = { ...createDefaultState(), focus_issue: 'second' };

    persistState(state1, statePath);
    persistState(state2, statePath);

    const loaded = loadState(statePath);
    expect(loaded?.focus_issue).toBe('second');
  });
});

describe('loadState', () => {
  test('returns null when no state file exists', () => {
    const statePath = join(tempDir, 'nonexistent.json');
    const result = loadState(statePath);
    expect(result).toBeNull();
  });

  test('cleans up stale .tmp file', () => {
    const statePath = join(tempDir, 'state.json');
    const tmpPath = statePath + '.tmp';

    // Simulate a failed write — only .tmp exists
    writeFileSync(tmpPath, '{"stale": true}', 'utf-8');

    expect(existsSync(tmpPath)).toBe(true);

    const result = loadState(statePath);

    // .tmp should be cleaned up
    expect(existsSync(tmpPath)).toBe(false);
    // No valid state file → null
    expect(result).toBeNull();
  });

  test('cleans up .tmp and loads valid state file', () => {
    const statePath = join(tempDir, 'state.json');
    const tmpPath = statePath + '.tmp';
    const state = { ...createDefaultState(), focus_issue: 'valid' };

    // Write valid state file
    persistState(state, statePath);
    // Simulate stale .tmp from a subsequent failed write
    writeFileSync(tmpPath, '{"stale": true}', 'utf-8');

    const result = loadState(statePath);

    expect(existsSync(tmpPath)).toBe(false);
    expect(result).not.toBeNull();
    expect(result?.focus_issue).toBe('valid');
  });

  test('reads default state correctly', () => {
    const statePath = join(tempDir, 'state.json');
    const state = createDefaultState();

    persistState(state, statePath);

    const loaded = loadState(statePath);
    expect(loaded?.version).toBe(1);
    expect(loaded?.focus_issue).toBeNull();
    expect(loaded?.phase).toBeNull();
    expect(loaded?.tdd_gate).toBe('locked');
    expect(loaded?.enabled).toBe(true);
  });
});
