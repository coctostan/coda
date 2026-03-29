/**
 * @module state/machine
 * Phase transition logic for the CODA state engine.
 *
 * Manages linear phase transitions through the issue lifecycle:
 * specify → plan → review → build → verify → unify → done
 *
 * Each transition is validated against the phase order and
 * checked by the relevant gate before proceeding.
 */

import type {
  CodaState,
  Phase,
  Submode,
  GateCheckData,
  TransitionResult,
  LoopIterationConfig,
} from './types';
import { PHASE_ORDER } from './types';
import { checkGate } from './gates';

const DEFAULT_MAX_REVIEW_ITERATIONS = 3;
const DEFAULT_MAX_VERIFY_ITERATIONS = 3;

/**
 * Attempt a phase transition on the given state.
 *
 * Validates that the transition is valid (next in linear sequence),
 * checks the relevant gate, and returns the updated state on success
 * or an error on failure.
 *
 * @param state - Current CODA state
 * @param to - Target phase to transition to
 * @param gateData - Data for gate validation
 * @returns TransitionResult with success/failure and updated state or error
 */
export function transition(
  state: CodaState,
  to: Phase,
  gateData: GateCheckData
): TransitionResult {
  const currentPhase = state.phase;

  // Handle null phase (initial state) — only allow transition to "specify"
  if (currentPhase === null) {
    if (to !== 'specify') {
      return {
        success: false,
        error: `Cannot transition from initial state to "${to}" — must start at "specify"`,
      };
    }

    return {
      success: true,
      state: applyPhaseState({ ...state, phase: 'specify' }, 'specify'),
    };
  }

  // Terminal state — no transitions from "done"
  if (currentPhase === 'done') {
    return {
      success: false,
      error: 'Cannot transition from "done" — it is a terminal state',
    };
  }

  // Validate that 'to' is the next phase in the linear sequence
  const currentIndex = PHASE_ORDER.indexOf(currentPhase);
  const targetIndex = PHASE_ORDER.indexOf(to);

  if (targetIndex !== currentIndex + 1) {
    return {
      success: false,
      error: `Invalid transition: "${currentPhase}" → "${to}". Next valid phase is "${PHASE_ORDER[currentIndex + 1] ?? 'none'}"`,
    };
  }

  // Check the gate for this transition
  const gateResult = checkGate(currentPhase, to, gateData);
  if (!gateResult.passed) {
    return {
      success: false,
      error: `Gate "${currentPhase}→${to}" blocked: ${gateResult.reason ?? 'unknown reason'}`,
    };
  }

  return {
    success: true,
    state: applyPhaseState({ ...state, phase: to }, to),
  };
}

/**
 * Transition between valid submodes inside review/verify phases.
 *
 * @param state - Current CODA state
 * @param targetSubmode - Target submode within the active phase
 * @returns Updated state with validated submode transition applied
 */
export function transitionSubmode(
  state: CodaState,
  targetSubmode: Submode | null
): CodaState {
  if (state.phase === 'review') {
    if (state.submode === 'review' && targetSubmode === 'revise') {
      return { ...state, submode: 'revise' };
    }

    if (state.submode === 'revise' && targetSubmode === 'review') {
      return {
        ...state,
        submode: 'review',
        loop_iteration: state.loop_iteration + 1,
      };
    }
  }

  if (state.phase === 'verify') {
    if (state.submode === 'verify' && targetSubmode === 'correct') {
      return { ...state, submode: 'correct' };
    }

    if (state.submode === 'correct' && targetSubmode === 'verify') {
      return {
        ...state,
        submode: 'verify',
        loop_iteration: state.loop_iteration + 1,
      };
    }
  }

  throw new Error(
    `Invalid submode transition: ${state.submode} → ${targetSubmode} in phase ${state.phase}`
  );
}

/**
 * Determine whether the current review/verify loop has exhausted its budget.
 *
 * @param state - Current CODA state
 * @param config - Loop iteration configuration
 * @returns True when the active review/verify loop has reached its configured limit
 */
export function isLoopExhausted(
  state: CodaState,
  config: LoopIterationConfig
): boolean {
  if (state.phase === 'review') {
    return state.loop_iteration >= (config.max_review_iterations ?? DEFAULT_MAX_REVIEW_ITERATIONS);
  }

  if (state.phase === 'verify') {
    return state.loop_iteration >= (config.max_verify_iterations ?? DEFAULT_MAX_VERIFY_ITERATIONS);
  }

  return false;
}

function applyPhaseState(state: CodaState, phase: Phase): CodaState {
  if (phase === 'review') {
    return {
      ...state,
      phase,
      submode: 'review',
      loop_iteration: 0,
    };
  }

  if (phase === 'verify') {
    return {
      ...state,
      phase,
      submode: 'verify',
      loop_iteration: 0,
    };
  }

  return {
    ...state,
    phase,
    submode: null,
    loop_iteration: 0,
  };
}
