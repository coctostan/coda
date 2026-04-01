/**
 * @module forge/scaffold
 * Directory and file creation for the FORGE greenfield flow.
 *
 * Creates the `.coda/` project structure with default configuration.
 * Uses raw `fs` operations — this is lower-level than @coda/core
 * because it creates the structure that core data layer reads.
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { ForgeBackdrop, CodaConfig } from './types';

/**
 * Detect whether the project is greenfield (no `.coda/`) or already initialized.
 *
 * @param projectRoot - Absolute path to the project root
 * @returns A ForgeBackdrop indicating the project state
 */
export function detectBackdrop(projectRoot: string): ForgeBackdrop {
  const codaDir = join(projectRoot, '.coda');
  if (existsSync(codaDir)) {
    return { type: 'existing' };
  }
  return { type: 'greenfield' };
}

/**
 * Return the default coda.json configuration object.
 *
 * @returns A CodaConfig with v0.2 defaults
 */
export function getDefaultConfig(): CodaConfig {
  return {
    tdd_test_command: null,
    full_suite_command: null,
    verification_commands: [],
    max_review_iterations: 3,
    max_verify_iterations: 3,
    tdd_gate: {
      feature: true,
      bugfix: true,
      refactor: true,
      chore: false,
      docs: false,
    },
    human_review_default: {
      feature: true,
      bugfix: true,
      refactor: false,
      chore: false,
      docs: false,
    },
    modules: {
      security: { enabled: true, blockThreshold: 'critical' },
      tdd: { enabled: true, blockThreshold: 'high' },
    },
  };
}

/**
 * Scaffold the `.coda/` directory structure with default configuration.
 *
 * Creates:
 * - `.coda/`
 * - `.coda/coda.json` (with defaults)
 * - `.coda/reference/`
 * - `.coda/issues/`
 * - `.coda/milestones/`
 *
 * @param projectRoot - Absolute path to the project root
 * @returns The absolute path to the created `.coda/` directory
 */
export function scaffoldCoda(projectRoot: string): string {
  const codaRoot = join(projectRoot, '.coda');

  mkdirSync(codaRoot, { recursive: true });
  mkdirSync(join(codaRoot, 'reference'), { recursive: true });
  mkdirSync(join(codaRoot, 'issues'), { recursive: true });
  mkdirSync(join(codaRoot, 'milestones'), { recursive: true });

  const config = getDefaultConfig();
  writeFileSync(
    join(codaRoot, 'coda.json'),
    JSON.stringify(config, null, 2),
    'utf-8'
  );

  return codaRoot;
}
