import { describe, test, expect } from 'bun:test';
import { transition } from '../machine';
import { createDefaultState, PHASE_ORDER } from '../types';
import type { CodaState, Phase, GateCheckData } from '../types';

/** Helper to create a state at a given phase. */
function stateAt(phase: Phase | null): CodaState {
  return { ...createDefaultState(), phase };
}

/** Gate data that passes all gates. */
const PASSING_DATA: GateCheckData = {
  issueAcCount: 3,
  planExists: true,
  planApproved: true,
  allPlannedTasksComplete: true,
  allAcsMet: true,
  completionRecordExists: true,
};

describe('createDefaultState', () => {
  test('returns correct initial values', () => {
    const state = createDefaultState();
    expect(state.version).toBe(1);
    expect(state.focus_issue).toBeNull();
    expect(state.phase).toBeNull();
    expect(state.current_task).toBeNull();
    expect(state.completed_tasks).toEqual([]);
    expect(state.tdd_gate).toBe('locked');
    expect(state.last_test_exit_code).toBeNull();
    expect(state.task_tool_calls).toBe(0);
    expect(state.enabled).toBe(true);
  });
});

describe('transition', () => {
  test('null → specify succeeds (initial state)', () => {
    const result = transition(stateAt(null), 'specify', {});
    expect(result.success).toBe(true);
    expect(result.state?.phase).toBe('specify');
  });

  test('all valid linear transitions succeed with passing gate data', () => {
    for (let i = 0; i < PHASE_ORDER.length - 1; i++) {
      const from = PHASE_ORDER[i]!;
      const to = PHASE_ORDER[i + 1]!;
      const result = transition(stateAt(from), to, PASSING_DATA);
      expect(result.success).toBe(true);
      expect(result.state?.phase).toBe(to);
    }
  });

  test('specify → plan succeeds with ACs present', () => {
    const result = transition(stateAt('specify'), 'plan', { issueAcCount: 2 });
    expect(result.success).toBe(true);
    expect(result.state?.phase).toBe('plan');
  });

  test('specify → plan fails without ACs', () => {
    const result = transition(stateAt('specify'), 'plan', { issueAcCount: 0 });
    expect(result.success).toBe(false);
    expect(result.error).toContain('acceptance criterion');
  });

  test('skip transitions are rejected (specify → build)', () => {
    const result = transition(stateAt('specify'), 'build', PASSING_DATA);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('backward transitions are rejected (build → plan)', () => {
    const result = transition(stateAt('build'), 'plan', PASSING_DATA);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('transition from done is rejected (terminal state)', () => {
    const result = transition(stateAt('done'), 'specify', PASSING_DATA);
    expect(result.success).toBe(false);
    expect(result.error).toContain('done');
  });

  test('transition to same phase is rejected', () => {
    const result = transition(stateAt('build'), 'build', PASSING_DATA);
    expect(result.success).toBe(false);
  });

  test('null → plan is rejected (must start at specify)', () => {
    const result = transition(stateAt(null), 'plan', PASSING_DATA);
    expect(result.success).toBe(false);
  });

  test('transition preserves other state fields', () => {
    const state: CodaState = {
      ...createDefaultState(),
      phase: 'specify',
      focus_issue: 'my-issue',
      tdd_gate: 'unlocked',
      task_tool_calls: 5,
    };
    const result = transition(state, 'plan', { issueAcCount: 1 });
    expect(result.success).toBe(true);
    expect(result.state?.focus_issue).toBe('my-issue');
    expect(result.state?.tdd_gate).toBe('unlocked');
    expect(result.state?.task_tool_calls).toBe(5);
  });

  test('build → verify fails when tasks incomplete', () => {
    const result = transition(stateAt('build'), 'verify', { allPlannedTasksComplete: false });
    expect(result.success).toBe(false);
    expect(result.error).toContain('tasks');
  });

  test('verify → unify fails when ACs not met', () => {
    const result = transition(stateAt('verify'), 'unify', { allAcsMet: false });
    expect(result.success).toBe(false);
    expect(result.error).toContain('acceptance criteria');
  });
});
