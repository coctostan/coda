/**
 * @module tools/coda-read
 * Read mdbase records from the `.coda/` directory.
 *
 * Supports full record reads and section-filtered reads
 * via the core data layer.
 */

import { readRecord, getSection } from '@coda/core';
import { join } from 'path';
import type { ReadInput, ReadResult } from './types';

/**
 * Read a record from the `.coda/` directory.
 *
 * Returns the full frontmatter and body. If a `section` is specified,
 * returns only the content under that `## Heading` from the body.
 *
 * @param input - Record path and optional section filter
 * @param codaRoot - Root path of the `.coda/` directory
 * @returns ReadResult with frontmatter and body (or section content)
 */
export function codaRead(input: ReadInput, codaRoot: string): ReadResult {
  try {
    const fullPath = join(codaRoot, input.record);
    const { frontmatter, body } = readRecord<Record<string, unknown>>(fullPath);

    if (input.section) {
      const sectionContent = getSection(body, input.section);
      return {
        success: true,
        frontmatter,
        body: sectionContent ?? '',
      };
    }

    return { success: true, frontmatter, body };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, frontmatter: {}, body: '', error: message };
  }
}
