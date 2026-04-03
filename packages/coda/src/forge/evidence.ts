/**
 * @module forge/evidence
 * Evidence file management for brownfield FORGE onboarding.
 *
 * Evidence files are markdown records with YAML frontmatter stored in
 * `.coda/forge/initial/onboarding/`. Each module produces one evidence
 * file during the SCAN phase, plus a universal evidence file.
 */

import { readRecord, writeRecord } from '@coda/core';
import { join } from 'path';
import { existsSync, readdirSync, mkdirSync } from 'fs';

/** Subdirectory within .coda/ for brownfield evidence files. */
export const EVIDENCE_DIR = 'forge/initial/onboarding';

/** Frontmatter schema for evidence files. */
export interface EvidenceFrontmatter {
  /** Which module produced this evidence (or "universal"). */
  module: string;
  /** ISO timestamp of the scan. */
  scanned_at: string;
  /** Files that were read during the scan. */
  files_read: string[];
  /** Commands that were run during the scan. */
  commands_run: string[];
}

/** A parsed evidence record with frontmatter and body. */
export interface EvidenceRecord {
  /** Parsed frontmatter. */
  frontmatter: EvidenceFrontmatter;
  /** Markdown body content. */
  body: string;
}

/**
 * Write an evidence file for a module scan.
 *
 * Creates the onboarding directory if it doesn't exist.
 * File is written at `.coda/forge/initial/onboarding/EVIDENCE-{moduleName}.md`.
 *
 * @param codaRoot - Path to the `.coda/` directory
 * @param moduleName - Module name (e.g., "security", "universal")
 * @param frontmatter - Evidence metadata
 * @param body - Markdown body with scan findings
 * @returns Absolute path to the written file
 */
export function writeEvidence(
  codaRoot: string,
  moduleName: string,
  frontmatter: EvidenceFrontmatter,
  body: string
): string {
  const dir = join(codaRoot, EVIDENCE_DIR);
  mkdirSync(dir, { recursive: true });

  const filePath = join(dir, `EVIDENCE-${moduleName}.md`);
  writeRecord(filePath, frontmatter, body);
  return filePath;
}

/**
 * Read a single evidence file by module name.
 *
 * @param codaRoot - Path to the `.coda/` directory
 * @param moduleName - Module name (e.g., "security")
 * @returns Parsed evidence record, or null if not found
 */
export function readEvidence(
  codaRoot: string,
  moduleName: string
): EvidenceRecord | null {
  const filePath = join(codaRoot, EVIDENCE_DIR, `EVIDENCE-${moduleName}.md`);
  if (!existsSync(filePath)) return null;

  try {
    const record = readRecord<EvidenceFrontmatter>(filePath);
    return { frontmatter: record.frontmatter, body: record.body };
  } catch {
    return null;
  }
}

/**
 * Read all evidence files from the onboarding directory.
 *
 * Returns files sorted by filename (alphabetical). Returns an empty
 * array if the directory doesn't exist or contains no evidence files.
 *
 * @param codaRoot - Path to the `.coda/` directory
 * @returns Array of parsed evidence records, sorted by filename
 */
export function readAllEvidence(codaRoot: string): EvidenceRecord[] {
  const dir = join(codaRoot, EVIDENCE_DIR);
  if (!existsSync(dir)) return [];

  try {
    const files = readdirSync(dir)
      .filter((f) => f.startsWith('EVIDENCE-') && f.endsWith('.md'))
      .sort();

    return files
      .map((file) => {
        try {
          const record = readRecord<EvidenceFrontmatter>(join(dir, file));
          return { frontmatter: record.frontmatter, body: record.body };
        } catch {
          return null;
        }
      })
      .filter((r): r is EvidenceRecord => r !== null);
  } catch {
    return [];
  }
}
