/**
 * @module pi/types
 * CODA-specific type definitions for the Pi extension layer.
 */

import type { CodaState } from '@coda/core';

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
