/**
 * @module tools/coda-edit-body
 * Section-aware body editing for `.coda/` records.
 *
 * Supports appending sections, replacing section content,
 * and appending raw text — all without touching frontmatter.
 */

import { readRecord, writeRecord, appendSection, replaceSection } from '@coda/core';
import { join } from 'path';
import type { EditBodyInput, EditBodyResult } from './types';

/**
 * Edit the body of an existing `.coda/` record.
 *
 * Supports three operations:
 * - `append_section`: Add a new `## Heading` section at the end
 * - `replace_section`: Replace content under an existing heading (appends if not found)
 * - `append_text`: Append raw text at the end (no heading)
 *
 * Never modifies frontmatter.
 *
 * @param input - Record path, operation, section name, and content
 * @param codaRoot - Root path of the `.coda/` directory
 * @returns EditBodyResult with a diff summary
 */
export function codaEditBody(input: EditBodyInput, codaRoot: string): EditBodyResult {
  try {
    const fullPath = join(codaRoot, input.record);
    const { frontmatter, body } = readRecord<Record<string, unknown>>(fullPath);

    let newBody: string;
    let summary: string;

    switch (input.op) {
      case 'append_section': {
        if (!input.section) {
          return { success: false, diff_summary: '', error: 'append_section requires a section name' };
        }
        newBody = appendSection(body, input.section, input.content);
        summary = `Appended section "## ${input.section}"`;
        break;
      }
      case 'replace_section': {
        if (!input.section) {
          return { success: false, diff_summary: '', error: 'replace_section requires a section name' };
        }
        newBody = replaceSection(body, input.section, input.content);
        summary = `Replaced section "## ${input.section}"`;
        break;
      }
      case 'append_text': {
        newBody = body + input.content;
        summary = `Appended ${String(input.content.length)} characters of text`;
        break;
      }
      default:
        return { success: false, diff_summary: '', error: `Unknown operation: ${String(input.op)}` };
    }

    // Write back with same frontmatter, new body
    writeRecord(fullPath, frontmatter, newBody);

    return { success: true, diff_summary: summary };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, diff_summary: '', error: message };
  }
}
