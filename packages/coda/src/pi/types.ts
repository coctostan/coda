/**
 * @module pi/types
 * CODA-specific type definitions for the Pi extension layer.
 */

import type { CodaState, Phase, TaskRecord } from '@coda/core';
import type { Submode } from '../../../core/src/state/types';

/**
 * Mutable CODA extension state cached between Pi lifecycle events.
 */
export interface CodaExtensionState {
  /** Absolute path to the CODA state file. */
  statePath: string;
  /** Most recently loaded state snapshot. */
  currentState: CodaState | null;
}

/**
 * Read access for the cached CODA extension state.
 */
export interface StateProvider {
  /** Return the last loaded state snapshot. */
  getState(): CodaState | null;
  /** Reload state from disk and update the cached snapshot. */
  refreshState(): CodaState | null;
}

/** Runtime metadata forwarded through Pi hook payloads. */
export interface CodaRuntimeDetails {
  /** Focused CODA issue slug. */
  focusIssue: string;
  /** Active lifecycle phase. */
  phase: Phase;
  /** Active review/verify submode, if any. */
  submode: Submode | null;
  /** Current review/verify loop iteration. */
  loopIteration: number;
  /** Active task id when task-scoped work is in progress. */
  currentTask: number | null;
  /** Active task kind when known. */
  taskKind: TaskRecord['kind'] | null;
}
