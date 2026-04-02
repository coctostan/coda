/**
 * @module tools/coda-run-tests
 * Execute test commands and manage the TDD write-gate.
 *
 * In TDD mode, failing tests unlock the write-gate (allowing production
 * code writes), and passing tests re-lock it. Suite mode runs tests
 * without affecting the gate.
 */

import { loadState, persistState } from '@coda/core';
import { dirname, resolve } from 'path';
import type { RunTestsInput, RunTestsResult } from './types';

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
function decodeOutput(output: Uint8Array<ArrayBufferLike>): string {
  return textDecoder.decode(output);
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
  config: { tdd_test_command?: string; full_suite_command?: string }
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

  try {
    const result = Bun.spawnSync({
      cmd,
      cwd: projectRoot,
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: COMMAND_TIMEOUT_MS,
    });

    stdout = decodeOutput(result.stdout);
    stderr = decodeOutput(result.stderr);
    exitCode = result.exitCode;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      exit_code: -1,
      passed: false,
      output: message.slice(0, MAX_OUTPUT_LENGTH),
      command: displayCommand,
      error: message,
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
