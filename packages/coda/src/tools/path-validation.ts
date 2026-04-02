/**
 * @module tools/path-validation
 * Shared path validation helpers for `.coda/` record access.
 */

import { resolve, sep } from 'path';

/**
 * Validate that a record path resolves within the `.coda/` directory.
 *
 * @param codaRoot - Root path of the `.coda/` directory
 * @param record - Record path provided by the caller
 * @returns The validated absolute record path
 * @throws Error when the resolved path escapes the `.coda/` directory
 */
export function validateRecordPath(codaRoot: string, record: string): string {
  const resolvedCodaRoot = resolve(codaRoot);
  const resolvedRecordPath = resolve(codaRoot, record);
  const codaRootPrefix = `${resolvedCodaRoot}${sep}`;

  if (resolvedRecordPath !== resolvedCodaRoot && !resolvedRecordPath.startsWith(codaRootPrefix)) {
    throw new Error('Record path must be within .coda/ directory');
  }

  return resolvedRecordPath;
}
