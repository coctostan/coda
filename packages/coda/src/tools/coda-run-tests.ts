/**
 * @module tools/coda-run-tests
 * Execute test commands and manage the TDD write-gate.
 *
 * In TDD mode, failing tests unlock the write-gate (allowing production
 * code writes), and passing tests re-lock it. Suite mode runs tests
 * without affecting the gate.
 */

import { loadState, persistState } from '@coda/core';
import { spawnSync as nodeSpawnSync } from 'node:child_process';
import { dirname, resolve } from 'path';
import type { RunTestsInput, RunTestsResult } from './types';
/** Subset of child_process.spawnSync return shape used by codaRunTests. */
export interface SpawnResult {
  status: number | null;
  stdout: Buffer | Uint8Array<ArrayBufferLike>;
  stderr: Buffer | Uint8Array<ArrayBufferLike>;
  error?: Error & { code?: string };
}

/** Swappable spawn interface — enables test injection without mocking module globals. */
export type SpawnImpl = (
  cmd: string,
  args: string[],
  opts: { cwd: string; timeout: number }
) => SpawnResult;

/** Maximum output length to capture (characters). */
const MAX_OUTPUT_LENGTH = 2000;

/** Maximum test command runtime in milliseconds. */
const COMMAND_TIMEOUT_MS = 120_000;

/** Shared decoder for subprocess output. */
const textDecoder = new TextDecoder();

/**
 * Split a configured command string into an executable and argument list.
 *
 * Supports shell-style whitespace, single quotes, double quotes, and
 * backslash escaping without invoking a shell.
 *
 * @param command - Command string from configuration
 * @returns Tokenized executable and argument array
 */
function splitCommand(command: string): string[] {
  const trimmedCommand = command.trim();

  if (trimmedCommand.length === 0) {
    throw new Error('Test command cannot be empty');
  }

  const parts: string[] = [];
  let current = '';
  let activeQuote: '"' | '\'' | null = null;
  let isEscaping = false;

  for (const character of trimmedCommand) {
    if (isEscaping) {
      current += character;
      isEscaping = false;
      continue;
    }

    if (character === '\\' && activeQuote !== '\'') {
      isEscaping = true;
      continue;
    }

    if (activeQuote) {
      if (character === activeQuote) {
        activeQuote = null;
      } else {
        current += character;
      }
      continue;
    }

    if (character === '"' || character === '\'') {
      activeQuote = character;
      continue;
    }

    if (/\s/.test(character)) {
      if (current.length > 0) {
        parts.push(current);
        current = '';
      }
      continue;
    }

    current += character;
  }

  if (isEscaping || activeQuote) {
    throw new Error('Test command contains unmatched quotes or escaping');
  }

  if (current.length > 0) {
    parts.push(current);
  }

  if (parts.length === 0) {
    throw new Error('Test command cannot be empty');
  }

  return parts;
}

/**
 * Decode subprocess output for result reporting.
 *
 * @param output - Buffered subprocess stream
 * @returns UTF-8 decoded output text
 */
function decodeOutput(output: Buffer | Uint8Array<ArrayBufferLike>): string {
  return textDecoder.decode(output);
}

/**
 * Detect the default spawn implementation for the current runtime.
 *
 * - Under Bun (`typeof Bun !== 'undefined'`): use `Bun.spawnSync` — the pre-Phase-55 fast path.
 *   Preserves the observed test latency and existing behavior when CODA is hosted by a Bun-based Pi.
 * - Otherwise: use `node:child_process.spawnSync`. The SpawnImpl adapter maps both return shapes
 *   onto our SpawnResult contract. The spawn takes `stdin: 'ignore'` under Node to match Bun's default.
 *
 * Tests may bypass detection entirely by passing `overrides.spawnImpl` to codaRunTests.
 */
function detectDefaultSpawn(): SpawnImpl {
  const bunGlobal = (globalThis as Record<string, unknown>)['Bun'] as
    | { spawnSync?: (opts: Record<string, unknown>) => { stdout: Uint8Array; stderr: Uint8Array; exitCode: number } }
    | undefined;

  if (bunGlobal && typeof bunGlobal.spawnSync === 'function') {
    return (cmd, args, opts) => {
      const result = bunGlobal.spawnSync!({
        cmd: [cmd, ...args],
        cwd: opts.cwd,
        stdout: 'pipe',
        stderr: 'pipe',
        timeout: opts.timeout,
      });
      return {
        status: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
      };
    };
  }

  return (cmd, args, opts) => {
    const result = nodeSpawnSync(cmd, args, {
      cwd: opts.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: opts.timeout,
      encoding: 'buffer',
    });
    return {
      status: result.status,
      stdout: result.stdout ?? Buffer.from(''),
      stderr: result.stderr ?? Buffer.from(''),
      error: result.error as (Error & { code?: string }) | undefined,
    };
  };
}

/**
 * Execute a test command and manage the TDD gate.
 *
 * - `tdd` mode: affects tdd_gate (exit ≠ 0 → unlocked, exit == 0 → locked)
 * - `suite` mode: runs tests without gate effect
 * - Missing command → error (never silently degrade)
 *
 * @param input - Test mode and optional pattern
 * @param statePath - Path to state.json
 * @param config - Test command configuration
 * @returns RunTestsResult with exit code, output, and pass/fail
 */
export function codaRunTests(
  input: RunTestsInput,
  statePath: string,
  config: { tdd_test_command?: string; full_suite_command?: string },
  overrides?: { spawnImpl?: SpawnImpl }
): RunTestsResult {
  const command = input.mode === 'tdd'
    ? config.tdd_test_command
    : config.full_suite_command;

  if (!command) {
    return {
      success: false,
      exit_code: -1,
      passed: false,
      output: '',
      command: '',
      error: `No test command configured for mode "${input.mode}"`,
    };
  }

  const displayCommand = input.pattern ? `${command} ${input.pattern}` : command;

  let parsedCommand: string[];
  try {
    parsedCommand = splitCommand(command);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      exit_code: -1,
      passed: false,
      output: '',
      command: displayCommand,
      error: message,
    };
  }

  const codaRoot = dirname(statePath);
  const projectRoot = resolve(codaRoot, '..');
  const cmd = input.pattern ? [...parsedCommand, input.pattern] : parsedCommand;

  let stdout = '';
  let stderr = '';
  let exitCode = -1;

  const spawn = overrides?.spawnImpl ?? detectDefaultSpawn();

  let spawnErrorMessage: string | null = null;
  try {
    const result = spawn(cmd[0]!, cmd.slice(1), {
      cwd: projectRoot,
      timeout: COMMAND_TIMEOUT_MS,
    });

    if (result.error) {
      spawnErrorMessage = result.error.message;
    } else if (result.status === null) {
      spawnErrorMessage = 'Test command exited without a status code (signal or timeout)';
    } else {
      stdout = decodeOutput(result.stdout);
      stderr = decodeOutput(result.stderr);
      exitCode = result.status;
    }
  } catch (err) {
    spawnErrorMessage = err instanceof Error ? err.message : String(err);
  }

  // Spawn failure path: state MUST NOT be mutated.
  if (spawnErrorMessage !== null) {
    return {
      success: false,
      exit_code: -1,
      passed: false,
      output: spawnErrorMessage.slice(0, MAX_OUTPUT_LENGTH),
      command: displayCommand,
      error: spawnErrorMessage,
    };
  }

  const output = (stdout + stderr).slice(0, MAX_OUTPUT_LENGTH);
  const passed = exitCode === 0;

  if (input.mode === 'tdd') {
    const state = loadState(statePath);
    if (state) {
      state.tdd_gate = passed ? 'locked' : 'unlocked';
      state.last_test_exit_code = exitCode;
      persistState(state, statePath);
    }
  } else {
    const state = loadState(statePath);
    if (state) {
      state.last_test_exit_code = exitCode;
      persistState(state, statePath);
    }
  }

  return {
    success: true,
    exit_code: exitCode,
    passed,
    output,
    command: displayCommand,
  };
}
