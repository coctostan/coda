/**
 * Todd — TDD Enforcement Module
 *
 * Loads the Todd prompt from modules/prompts/todd.md and exports it
 * for injection by the workflow engine at pre-build hook points.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

/** Path to the repo root (4 levels up from packages/coda/src/modules/) */
const REPO_ROOT = resolve(import.meta.dir, '..', '..', '..', '..');

/** The full Todd TDD enforcement prompt, loaded from markdown data file */
export const TODD_PROMPT: string = readFileSync(
  resolve(REPO_ROOT, 'modules', 'prompts', 'todd.md'),
  'utf-8'
);

/** Hook points where Todd's prompt should be injected */
export const TODD_HOOK_POINTS: readonly string[] = ['pre-build'] as const;
