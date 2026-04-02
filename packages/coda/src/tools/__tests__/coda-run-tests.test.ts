import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { codaRunTests } from '../coda-run-tests';
import { persistState, loadState, createDefaultState } from '@coda/core';
import type { CodaState } from '@coda/core';

let tempProjectDir: string;
let codaDir: string;
let statePath: string;

beforeEach(() => {
  tempProjectDir = mkdtempSync(join(tmpdir(), 'coda-run-tests-'));
  codaDir = join(tempProjectDir, '.coda');
  mkdirSync(codaDir, { recursive: true });
  statePath = join(codaDir, 'state.json');
});

afterEach(() => {
  rmSync(tempProjectDir, { recursive: true, force: true });
});

describe('codaRunTests', () => {
  test('tdd mode with failing tests unlocks tdd_gate', () => {
    const state: CodaState = { ...createDefaultState(), tdd_gate: 'locked' };
    persistState(state, statePath);

    const result = codaRunTests(
      { mode: 'tdd' },
      statePath,
      { tdd_test_command: 'bun -e "process.exit(1)"' }
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
      { tdd_test_command: 'bun -e "process.exit(0)"' }
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
      { full_suite_command: 'bun -e "process.exit(1)"' }
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

    const command = 'bun -e "console.log(\'all tests pass\')"';
    const result = codaRunTests(
      { mode: 'suite' },
      statePath,
      { full_suite_command: command }
    );

    expect(result.success).toBe(true);
    expect(result.exit_code).toBe(0);
    expect(result.passed).toBe(true);
    expect(result.output).toContain('all tests pass');
    expect(result.command).toBe(command);
  });

  test('runs from the project root and treats pattern as a literal argument', () => {
    persistState(createDefaultState(), statePath);

    writeFileSync(
      join(tempProjectDir, 'capture.ts'),
      [
        "import { writeFileSync } from 'fs';",
        "import { join } from 'path';",
        "writeFileSync(",
        "  join(process.cwd(), 'run-tests-output.json'),",
        "  JSON.stringify({ cwd: process.cwd(), args: process.argv.slice(2) })",
        ");",
        "console.log('captured');",
      ].join('\n')
    );

    const result = codaRunTests(
      { mode: 'suite', pattern: '$(touch injected.txt)' },
      statePath,
      { full_suite_command: 'bun capture.ts' }
    );

    expect(result.success).toBe(true);
    expect(result.exit_code).toBe(0);
    expect(result.passed).toBe(true);
    expect(result.output).toContain('captured');
    expect(existsSync(join(tempProjectDir, 'injected.txt'))).toBe(false);

    const runDetails = JSON.parse(
      readFileSync(join(tempProjectDir, 'run-tests-output.json'), 'utf-8')
    ) as { cwd: string; args: string[] };

    expect(realpathSync(runDetails.cwd)).toBe(realpathSync(tempProjectDir));
    expect(runDetails.args).toEqual(['$(touch injected.txt)']);
  });
});
