/**
 * @module state
 * L2 State Engine — CODA's lifecycle coordination layer.
 *
 * Provides phase transition logic, gate enforcement, and atomic
 * state persistence for tracking issue lifecycle position.
 *
 * @example
 * ```typescript
 * import { createDefaultState, transition, persistState, loadState } from '@coda/core';
 *
 * const state = createDefaultState();
 * const result = transition(state, 'specify', {});
 * if (result.success && result.state) {
 *   persistState(result.state, '.coda/state.json');
 * }
 * ```
 */

// Type schemas
export type { Phase, CodaState, Gate, GateCheckData, TransitionResult } from './types';

// Constants and factory
export { PHASE_ORDER, createDefaultState } from './types';

// Phase transition machine
export { transition } from './machine';

// Gate checking
export { checkGate, GATES } from './gates';

// Atomic state persistence
export { persistState, loadState } from './store';
