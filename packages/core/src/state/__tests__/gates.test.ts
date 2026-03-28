import { describe, test, expect } from 'bun:test';
import { checkGate, GATES } from '../gates';

describe('GATES', () => {
  test('has 6 gates defined', () => {
    expect(Object.keys(GATES)).toHaveLength(6);
  });

  test('specify→plan passes with ACs present', () => {
    const result = checkGate('specify', 'plan', { issueAcCount: 3 });
    expect(result.passed).toBe(true);
  });

  test('specify→plan fails with zero ACs', () => {
    const result = checkGate('specify', 'plan', { issueAcCount: 0 });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('acceptance criterion');
  });

  test('specify→plan fails with undefined ACs', () => {
    const result = checkGate('specify', 'plan', {});
    expect(result.passed).toBe(false);
  });

  test('plan→review passes when plan exists', () => {
    const result = checkGate('plan', 'review', { planExists: true });
    expect(result.passed).toBe(true);
  });

  test('plan→review fails when plan does not exist', () => {
    const result = checkGate('plan', 'review', { planExists: false });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('Plan must exist');
  });

  test('review→build passes when plan approved', () => {
    const result = checkGate('review', 'build', { planApproved: true });
    expect(result.passed).toBe(true);
  });

  test('review→build fails when plan not approved', () => {
    const result = checkGate('review', 'build', { planApproved: false });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('approved');
  });

  test('build→verify passes when all tasks complete', () => {
    const result = checkGate('build', 'verify', { allPlannedTasksComplete: true });
    expect(result.passed).toBe(true);
  });

  test('build→verify fails when tasks incomplete', () => {
    const result = checkGate('build', 'verify', { allPlannedTasksComplete: false });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('tasks');
  });

  test('verify→unify passes when all ACs met', () => {
    const result = checkGate('verify', 'unify', { allAcsMet: true });
    expect(result.passed).toBe(true);
  });

  test('verify→unify fails when ACs not met', () => {
    const result = checkGate('verify', 'unify', { allAcsMet: false });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('acceptance criteria');
  });

  test('unify→done passes when completion record exists', () => {
    const result = checkGate('unify', 'done', { completionRecordExists: true });
    expect(result.passed).toBe(true);
  });

  test('unify→done fails when completion record missing', () => {
    const result = checkGate('unify', 'done', { completionRecordExists: false });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('Completion record');
  });
});

describe('checkGate', () => {
  test('returns passed for undefined transition (no gate)', () => {
    // There's no gate for specify→build (it's an invalid transition, but no gate)
    const result = checkGate('specify', 'build', {});
    expect(result.passed).toBe(true);
  });

  test('returns passed for adjacent transitions with no gate defined', () => {
    // If somehow a gate wasn't defined, it passes by default
    const result = checkGate('done', 'specify', {});
    expect(result.passed).toBe(true);
  });
});
