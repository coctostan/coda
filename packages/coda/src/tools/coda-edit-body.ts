/**
 * @module tools/coda-edit-body
 * Section-aware body editing for `.coda/` records.
 *
 * Supports appending sections, replacing section content,
 * and appending raw text — all without touching frontmatter.
 */

import { mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { readRecord, writeRecord, appendSection, replaceSection, ReplaceSectionError } from '@coda/core';
import type { EditBodyInput, EditBodyResult } from './types';
import { validateRecordPath } from './path-validation';

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
    const fullPath = validateRecordPath(codaRoot, input.record);

    if (!existsSync(fullPath)) {
      if (input.create_if_missing) {
        mkdirSync(dirname(fullPath), { recursive: true });
        writeRecord(fullPath, {}, input.content);
        return {
          success: true,
          diff_summary: `Created record "${input.record}" with ${String(input.content.length)} characters of body content`,
        };
      }

      readRecord<Record<string, unknown>>(fullPath);
    }

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
        try {
          newBody = replaceSection(body, input.section, input.content);
          summary = `Replaced section "## ${input.section}"`;
        } catch (err) {
          if (err instanceof ReplaceSectionError) {
            if (err.kind === 'not_found') {
              // Only explicit create_if_missing:true may fall back to append.
              if (input.create_if_missing) {
                newBody = appendSection(body, input.section, input.content);
                summary = `Appended new section "## ${input.section}" (create_if_missing)`;
                break;
              }
              return {
                success: false,
                diff_summary: '',
                error: `replace_section: no "## ${input.section}" section found. Pass create_if_missing: true to append it.`,
              };
            }
            return { success: false, diff_summary: '', error: `replace_section: ${err.message}` };
          }
          throw err;
        }
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
