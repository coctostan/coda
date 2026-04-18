import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { assembleScanContext, detectBackdrop, scaffoldCoda } from '../forge';
import type { ForgeInput, ForgeOutput } from './types';

/**
 * Read the scaffolded coda.json and report whether test commands still need
 * operator configuration. Phase 58 C3: when scaffold cannot safely infer a
 * toolchain-compatible test command, the FORGE handoff must explicitly name
 * the follow-up (`coda_config`) instead of leaving it a latent trap.
 */
function testCommandsMissing(codaRoot: string): boolean {
  try {
    const cfg = JSON.parse(readFileSync(join(codaRoot, 'coda.json'), 'utf-8')) as {
      tdd_test_command?: string | null;
      full_suite_command?: string | null;
    };
    return !cfg.tdd_test_command || !cfg.full_suite_command;
  } catch {
    return true;
  }
}

const CONFIG_FOLLOWUP =
  ' Then run coda_config to set tdd_test_command and full_suite_command (e.g., "bun test" or your project\'s equivalent) before relying on TDD.';

export function codaForge(params: ForgeInput, defaultProjectRoot: string): ForgeOutput {
  const projectRoot = params.project_root ?? defaultProjectRoot;
  const backdrop = detectBackdrop(projectRoot);

  if (backdrop.type === 'existing') {
    return {
      status: 'already_initialized',
      backdrop: 'existing',
      coda_root: join(projectRoot, '.coda'),
      next_action: 'Use coda_create to create the next issue, then coda_focus to begin its lifecycle.',
    };
  }

  const codaRoot = scaffoldCoda(projectRoot);
  const needsConfig = testCommandsMissing(codaRoot);

  if (backdrop.type === 'brownfield') {
    const promptsDir = resolve(__dirname, '..', '..', '..', '..', 'modules', 'prompts');
    const base = 'Review scan_context, then use coda_create to create the onboarding issue and coda_focus to begin it.';
    return {
      status: 'scaffolded',
      backdrop: 'brownfield',
      coda_root: codaRoot,
      next_action: needsConfig ? base + CONFIG_FOLLOWUP : base,
      scan_context: assembleScanContext(projectRoot, promptsDir),
    };
  }

  const base = 'Use coda_create to create your first issue, then coda_focus to begin its lifecycle.';
  return {
    status: 'scaffolded',
    backdrop: 'greenfield',
    coda_root: codaRoot,
    next_action: needsConfig ? base + CONFIG_FOLLOWUP : base,
  };
}
