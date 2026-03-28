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

import type { CodaState, Phase, GateCheckData, TransitionResult } from './types';
import { PHASE_ORDER } from './types';
import { checkGate } from './gates';

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
      state: { ...state, phase: 'specify' },
    };
  }

  // Terminal state — no transitions from "done"
  if (currentPhase === 'done') {
    return {
      success: false,
      error: `Cannot transition from "done" — it is a terminal state`,
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

  // Transition succeeds — update phase, preserve all other state
  return {
    success: true,
    state: { ...state, phase: to },
  };
}
