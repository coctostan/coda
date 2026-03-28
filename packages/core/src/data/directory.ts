/**
 * @module directory
 * Directory listing operations for CODA mdbase records.
 *
 * Provides simple directory scanning to find all markdown record files
 * in a given directory. Only reads direct children (non-recursive).
 */

import { readdirSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * List all `.md` record files in a directory.
 *
 * Returns absolute paths of all `.md` files that are direct children
 * of the given directory. Results are sorted alphabetically for
 * deterministic output.
 *
 * @param dir - Path to the directory to scan
 * @returns Array of file paths for all `.md` files, or empty array if directory doesn't exist
 */
export function listRecords(dir: string): string[] {
  if (!existsSync(dir)) {
    return [];
  }

  const entries = readdirSync(dir, { withFileTypes: true });

  const mdFiles: string[] = [];
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.md')) {
      mdFiles.push(join(dir, entry.name));
    }
  }
  return mdFiles.sort();
}
