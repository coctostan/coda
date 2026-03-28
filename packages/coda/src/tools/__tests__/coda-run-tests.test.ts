import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { codaRunTests } from '../coda-run-tests';
import { persistState, loadState, createDefaultState } from '@coda/core';
import type { CodaState } from '@coda/core';

let tempDir: string;
let statePath: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'coda-run-tests-'));
  statePath = join(tempDir, 'state.json');
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe('codaRunTests', () => {
  test('tdd mode with failing tests unlocks tdd_gate', () => {
    const state: CodaState = { ...createDefaultState(), tdd_gate: 'locked' };
    persistState(state, statePath);

    const result = codaRunTests(
      { mode: 'tdd' },
      statePath,
      { tdd_test_command: 'exit 1' }
    );

    expect(result.exit_code).not.toBe(0);
    expect(result.passed).toBe(false);

    const updated = loadState(statePath);
    expect(updated?.tdd_gate).toBe('unlocked');
  });

  test('tdd mode with passing tests locks tdd_gate', () => {
    const state: CodaState = { ...createDefaultState(), tdd_gate: 'unlocked' };
    persistState(state, statePath);

    const result = codaRunTests(
      { mode: 'tdd' },
      statePath,
      { tdd_test_command: 'exit 0' }
    );

    expect(result.exit_code).toBe(0);
    expect(result.passed).toBe(true);

    const updated = loadState(statePath);
    expect(updated?.tdd_gate).toBe('locked');
  });

  test('suite mode does not affect tdd_gate', () => {
    const state: CodaState = { ...createDefaultState(), tdd_gate: 'locked' };
    persistState(state, statePath);

    codaRunTests(
      { mode: 'suite' },
      statePath,
      { full_suite_command: 'exit 1' }
    );

    const updated = loadState(statePath);
    expect(updated?.tdd_gate).toBe('locked');
  });

  test('missing test command returns error', () => {
    persistState(createDefaultState(), statePath);

    const result = codaRunTests(
      { mode: 'tdd' },
      statePath,
      {}
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('command');
  });

  test('returns exit_code, passed, output, and command', () => {
    persistState(createDefaultState(), statePath);

    const result = codaRunTests(
      { mode: 'suite' },
      statePath,
      { full_suite_command: 'echo "all tests pass"' }
    );

    expect(result.success).toBe(true);
    expect(result.exit_code).toBe(0);
    expect(result.passed).toBe(true);
    expect(result.output).toContain('all tests pass');
    expect(result.command).toBe('echo "all tests pass"');
  });
});
