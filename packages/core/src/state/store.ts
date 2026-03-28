/**
 * @module state/store
 * Atomic state persistence for the CODA state engine.
 *
 * State is written atomically via a temp-file-then-rename strategy:
 * write to `path.tmp`, then rename to `path`. This ensures that a
 * crash mid-write never corrupts the state file.
 *
 * On load, any stale `.tmp` file is cleaned up (evidence of a prior failed write).
 */

import { readFileSync, writeFileSync, renameSync, unlinkSync, existsSync } from 'fs';
import type { CodaState } from './types';

/**
 * Persist state to disk atomically.
 *
 * Writes to a temporary file first, then renames to the target path.
 * This ensures the state file is never in a partially-written state.
 *
 * @param state - The CodaState to persist
 * @param path - File path to write the state JSON
 */
export function persistState(state: CodaState, path: string): void {
  const tmp = path + '.tmp';
  writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf-8');
  renameSync(tmp, path);
}

/**
 * Load state from disk, cleaning up any stale temp files.
 *
 * If a `.tmp` file exists alongside the state file, it is deleted
 * (evidence of a failed prior write). If the state file itself
 * doesn't exist, returns null.
 *
 * @param path - File path to read the state JSON from
 * @returns The loaded CodaState, or null if no state file exists
 */
export function loadState(path: string): CodaState | null {
  const tmp = path + '.tmp';

  // Clean up stale temp file from a failed prior write
  if (existsSync(tmp)) {
    unlinkSync(tmp);
  }

  // No state file → null
  if (!existsSync(path)) {
    return null;
  }

  const content = readFileSync(path, 'utf-8');
  return JSON.parse(content) as CodaState;
}
