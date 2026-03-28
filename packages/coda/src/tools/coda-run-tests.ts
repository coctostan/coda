/**
 * @module tools/coda-run-tests
 * Execute test commands and manage the TDD write-gate.
 *
 * In TDD mode, failing tests unlock the write-gate (allowing production
 * code writes), and passing tests re-lock it. Suite mode runs tests
 * without affecting the gate.
 */

import { loadState, persistState } from '@coda/core';
import { spawnSync } from 'child_process';
import type { RunTestsInput, RunTestsResult } from './types';

/** Maximum output length to capture (characters). */
const MAX_OUTPUT_LENGTH = 2000;

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
  // Resolve command based on mode
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

  // Build the full command with optional pattern
  const fullCommand = input.pattern ? `${command} ${input.pattern}` : command;

  // Execute the command
  const result = spawnSync('sh', ['-c', fullCommand], {
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 120_000,
  });

  const stdout = result.stdout?.toString('utf-8') ?? '';
  const stderr = result.stderr?.toString('utf-8') ?? '';
  const output = (stdout + stderr).slice(0, MAX_OUTPUT_LENGTH);
  const exitCode = result.status ?? 1;
  const passed = exitCode === 0;

  // TDD gate management (tdd mode only)
  if (input.mode === 'tdd') {
    const state = loadState(statePath);
    if (state) {
      state.tdd_gate = passed ? 'locked' : 'unlocked';
      state.last_test_exit_code = exitCode;
      persistState(state, statePath);
    }
  } else {
    // Suite mode: just record exit code, no gate effect
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
    command: fullCommand,
  };
}
