/**
 * @module tools/write-gate
 * Write-gate interceptor for `.coda/` protection and TDD enforcement.
 *
 * This is a pure function (not a tool) — it checks whether a write
 * operation should be allowed based on:
 * 1. `.coda/` protection: all `.coda/` writes must go through coda_* tools
 * 2. TDD enforcement: non-test files are blocked when tdd_gate is locked
 */

import type { WriteGateCheck, WriteGateResult } from './types';

/**
 * Check whether a file path matches test file patterns.
 *
 * Matches: `*.test.*`, `*.spec.*`, `__tests__/**`, `test/**`
 *
 * @param path - File path to check
 * @returns true if the file is a test file
 */
export function isTestFile(path: string): boolean {
  // *.test.* or *.spec.*
  if (/\.test\./.test(path) || /\.spec\./.test(path)) {
    return true;
  }

  // __tests__/ directory
  if (path.includes('__tests__/') || path.includes('__tests__\\')) {
    return true;
  }

  // test/ directory (at start or after separator)
  if (/(?:^|[/\\])test[/\\]/.test(path)) {
    return true;
  }

  return false;
}

/**
 * Check whether a write/edit operation should be allowed.
 *
 * Rules:
 * 1. Writes to `.coda/**` → blocked ("Use coda_* tools")
 * 2. When `tdd_gate == "locked"`:
 *    - Test files → allowed
 *    - Non-test files → blocked ("Write a failing test first")
 * 3. When `tdd_gate == "unlocked"` → all writes allowed
 *
 * @param check - The write operation to validate
 * @param state - Current TDD gate state
 * @returns WriteGateResult with allowed/blocked and reason
 */
export function checkWriteGate(
  check: WriteGateCheck,
  state: { tdd_gate: 'locked' | 'unlocked' }
): WriteGateResult {
  // Rule 1: .coda/ protection
  if (check.path.startsWith('.coda/') || check.path.startsWith('.coda\\')) {
    return {
      allowed: false,
      reason: 'Use coda_* tools to modify .coda/ files',
    };
  }

  // Rule 2: TDD enforcement
  if (state.tdd_gate === 'locked') {
    if (isTestFile(check.path)) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: 'Write a failing test first. Run coda_run_tests to unlock.',
    };
  }

  // tdd_gate unlocked — all writes allowed
  return { allowed: true };
}
