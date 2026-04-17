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

describe('codaRunTests runtime portability', () => {
  test('runs successfully against an injected Node spawn (Bun-free path)', () => {
    persistState(createDefaultState(), statePath);

    let capturedCall: { cmd: string; args: string[]; cwd: string } | null = null;
    const fakeSpawn = (cmd: string, args: string[], opts: { cwd: string; timeout: number }) => {
      capturedCall = { cmd, args, cwd: opts.cwd };
      return {
        status: 0,
        stdout: Buffer.from('42\n'),
        stderr: Buffer.from(''),
      };
    };

    const result = codaRunTests(
      { mode: 'suite' },
      statePath,
      { full_suite_command: 'anything.ts' },
      { spawnImpl: fakeSpawn }
    );

    expect(result.success).toBe(true);
    expect(result.exit_code).toBe(0);
    expect(result.passed).toBe(true);
    expect(result.output).toContain('42');
    expect(capturedCall).not.toBeNull();
    expect(capturedCall!.cmd).toBe('anything.ts');
    // cwd should resolve to the project root (parent of .coda)
    expect(realpathSync(capturedCall!.cwd)).toBe(realpathSync(tempProjectDir));
  });

  test('returns ENOENT-style error when the spawn impl reports missing binary', () => {
    const preState: CodaState = { ...createDefaultState(), tdd_gate: 'locked', last_test_exit_code: 7 };
    persistState(preState, statePath);

    const enoentError = Object.assign(new Error('spawn definitely-not-a-binary-xyz-55 ENOENT'), { code: 'ENOENT' });
    const fakeSpawn = (_cmd: string, _args: string[], _opts: { cwd: string; timeout: number }) => ({
      status: null,
      stdout: Buffer.from(''),
      stderr: Buffer.from(''),
      error: enoentError,
    });

    const result = codaRunTests(
      { mode: 'tdd' },
      statePath,
      { tdd_test_command: 'definitely-not-a-binary-xyz-55' },
      { spawnImpl: fakeSpawn }
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/ENOENT|not found|cannot find/i);

    // State must be unchanged on spawn failure.
    const after = loadState(statePath);
    expect(after?.tdd_gate).toBe('locked');
    expect(after?.last_test_exit_code).toBe(7);
  });

  // Runtime-detection via globalThis.Bun masking is not feasible inside Bun's test harness:
  // `globalThis.Bun` is a readonly property, so the module cannot be forced onto the Node branch
  // without running the suite under a non-Bun runtime. The injection tests above exercise the
  // Node code path directly via `spawnImpl`, which is the primary AC-1 signal. This placeholder
  // preserves intent; upgrade to a real test if the suite is ever run under Node.
  test.todo('Node path is selected when Bun global is unavailable (requires non-Bun test harness)');
});
