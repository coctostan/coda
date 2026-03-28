import { describe, test, expect } from 'bun:test';
import { checkWriteGate, isTestFile } from '../write-gate';

describe('isTestFile', () => {
  test('detects *.test.* files', () => {
    expect(isTestFile('src/app.test.ts')).toBe(true);
    expect(isTestFile('lib/utils.test.js')).toBe(true);
  });

  test('detects *.spec.* files', () => {
    expect(isTestFile('src/app.spec.ts')).toBe(true);
  });

  test('detects __tests__/ files', () => {
    expect(isTestFile('src/__tests__/app.ts')).toBe(true);
    expect(isTestFile('packages/core/src/data/__tests__/records.test.ts')).toBe(true);
  });

  test('detects test/ files', () => {
    expect(isTestFile('test/integration.ts')).toBe(true);
  });

  test('rejects non-test files', () => {
    expect(isTestFile('src/app.ts')).toBe(false);
    expect(isTestFile('src/utils.js')).toBe(false);
    expect(isTestFile('README.md')).toBe(false);
  });
});

describe('checkWriteGate', () => {
  test('blocks writes to .coda/ paths', () => {
    const result = checkWriteGate(
      { path: '.coda/issues/foo.md', operation: 'write' },
      { tdd_gate: 'unlocked' }
    );

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('coda_* tools');
  });

  test('blocks edits to .coda/ paths', () => {
    const result = checkWriteGate(
      { path: '.coda/state.json', operation: 'edit' },
      { tdd_gate: 'unlocked' }
    );

    expect(result.allowed).toBe(false);
  });

  test('blocks non-test writes when tdd_gate locked', () => {
    const result = checkWriteGate(
      { path: 'src/app.ts', operation: 'write' },
      { tdd_gate: 'locked' }
    );

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('failing test');
  });

  test('allows test file writes when tdd_gate locked', () => {
    const result = checkWriteGate(
      { path: 'src/app.test.ts', operation: 'write' },
      { tdd_gate: 'locked' }
    );

    expect(result.allowed).toBe(true);
  });

  test('allows __tests__/ writes when tdd_gate locked', () => {
    const result = checkWriteGate(
      { path: 'src/__tests__/foo.ts', operation: 'write' },
      { tdd_gate: 'locked' }
    );

    expect(result.allowed).toBe(true);
  });

  test('allows non-test writes when tdd_gate unlocked', () => {
    const result = checkWriteGate(
      { path: 'src/app.ts', operation: 'write' },
      { tdd_gate: 'unlocked' }
    );

    expect(result.allowed).toBe(true);
  });

  test('allows writes outside .coda/ when tdd_gate unlocked', () => {
    const result = checkWriteGate(
      { path: 'README.md', operation: 'edit' },
      { tdd_gate: 'unlocked' }
    );

    expect(result.allowed).toBe(true);
  });
});
