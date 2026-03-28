/**
 * Walt — Post-Task Quality Check Module
 *
 * Loads the Walt prompt from modules/prompts/walt.md and exports it
 * for injection by the workflow engine at post-task and post-build hook points.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

/** Path to the repo root (4 levels up from packages/coda/src/modules/) */
const REPO_ROOT = resolve(import.meta.dir, '..', '..', '..', '..');

/** The full Walt quality check prompt, loaded from markdown data file */
export const WALT_PROMPT: string = readFileSync(
  resolve(REPO_ROOT, 'modules', 'prompts', 'walt.md'),
  'utf-8'
);

/** Hook points where Walt's prompt should be injected */
export const WALT_HOOK_POINTS: readonly string[] = ['post-task', 'post-build'] as const;
