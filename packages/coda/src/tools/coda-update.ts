/**
 * @module tools/coda-update
 * Update frontmatter fields on an existing `.coda/` record.
 *
 * Merges the provided fields into existing frontmatter without
 * touching the body or unspecified fields.
 */

import { updateFrontmatter } from '@coda/core';
import type { UpdateInput, UpdateResult } from './types';
import { validateRecordPath } from './path-validation';

/**
 * Update frontmatter fields on an existing record.
 *
 * Merges the provided fields into existing frontmatter.
 * The body and unspecified fields remain unchanged.
 *
 * @param input - Record path and partial fields to merge
 * @param codaRoot - Root path of the `.coda/` directory
 * @returns UpdateResult with the list of updated field names
 */
export function codaUpdate(input: UpdateInput, codaRoot: string): UpdateResult {
  try {
    const fullPath = validateRecordPath(codaRoot, input.record);
    updateFrontmatter(fullPath, input.fields);

    return {
      success: true,
      updated_fields: Object.keys(input.fields),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, updated_fields: [], error: message };
  }
}
