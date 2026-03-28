/**
 * Walt — Post-Task Quality Check Module
 *
 * Loads the Walt prompt from modules/prompts/walt.md and exports it
 * for injection by the workflow engine at post-task and post-build hook points.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
/** Path to the repo root (4 levels up from packages/coda/src/modules/) */
const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..', '..', '..');

/** The full Walt quality check prompt, loaded from markdown data file */
export const WALT_PROMPT: string = readFileSync(
  resolve(REPO_ROOT, 'modules', 'prompts', 'walt.md'),
  'utf-8'
);

/** Hook points where Walt's prompt should be injected */
export const WALT_HOOK_POINTS: readonly string[] = ['post-task', 'post-build'] as const;
