/**
 * @module forge/scaffold
 * Directory and file creation for the FORGE greenfield flow.
 *
 * Creates the `.coda/` project structure with default configuration.
 * Uses raw `fs` operations — this is lower-level than @coda/core
 * because it creates the structure that core data layer reads.
 */

import { createDefaultState, persistState } from '@coda/core';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { ForgeBackdrop, CodaConfig } from './types';

/**
 * Detect whether the project is greenfield, brownfield, or already initialized.
 *
 * - **existing**: `.coda/` directory already present
 * - **brownfield**: No `.coda/` but has code indicators (package.json, src/, etc.)
 * - **greenfield**: No `.coda/` and no code indicators
 *
 * @param projectRoot - Absolute path to the project root
 * @returns A ForgeBackdrop indicating the project state
 */
export function detectBackdrop(projectRoot: string): ForgeBackdrop {
  const codaDir = join(projectRoot, '.coda');
  if (existsSync(codaDir)) {
    return { type: 'existing' };
  }

  // Check for code indicators
  const codeIndicators = [
    'package.json', 'Cargo.toml', 'go.mod', 'pyproject.toml',
    'pom.xml', 'Gemfile', 'composer.json',
  ];
  const hasCode = codeIndicators.some((f) => existsSync(join(projectRoot, f)));

  const srcDirs = ['src', 'lib', 'app', 'cmd', 'pkg'];
  const hasSrcDir = srcDirs.some((d) => existsSync(join(projectRoot, d)));

  if (hasCode || hasSrcDir) {
    return { type: 'brownfield' };
  }
  return { type: 'greenfield' };
}

/**
 * Return the default coda.json configuration object.
 *
 * When `projectRoot` is provided, scaffold inspects conservative toolchain
 * signals (Bun lockfile or an explicit `bun test` script) and seeds
 * `tdd_test_command` / `full_suite_command` with `bun test`. Otherwise the
 * commands stay null so the operator configures them via `coda_config`
 * before relying on TDD. Phase 58 C3: no guessing for ambiguous toolchains.
 *
 * @param projectRoot - Optional project root for detection. Omit for defaults-only.
 * @returns A CodaConfig with v0.2 defaults, optionally with seeded test commands
 */
export function getDefaultConfig(projectRoot?: string): CodaConfig {
  const detected = projectRoot ? detectTestCommand(projectRoot) : null;
  return {
    tdd_test_command: detected,
    full_suite_command: detected,
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
    modules: {
      security: { enabled: true, blockThreshold: 'critical' },
      tdd: { enabled: true, blockThreshold: 'high' },
    },
    gates: {
      plan_review: 'human',
      build_review: 'auto-unless-block',
      unify_review: 'human',
    },
  };
}

/**
 * Detect a safe default test command from project-root signals.
 *
 * Returns `'bun test'` only when the toolchain signal is unambiguous AND
 * compatible with `coda_run_tests` pattern semantics (positional arg append):
 * - A Bun lockfile (`bun.lock` or `bun.lockb`) alongside `package.json`, OR
 * - An explicit `scripts.test` entry equal to `bun test` in package.json.
 *
 * Other toolchains (npm/yarn/pnpm with jest/vitest/mocha) are deliberately
 * NOT inferred: npm-style runners pass patterns via `-- <pattern>` which
 * coda_run_tests does not format. Returning null keeps `coda_config` as the
 * explicit follow-up path instead of a latent TDD-breakage trap.
 */
function detectTestCommand(projectRoot: string): string | null {
  const packageJsonPath = join(projectRoot, 'package.json');
  if (!existsSync(packageJsonPath)) {
    return null;
  }

  const hasBunLock =
    existsSync(join(projectRoot, 'bun.lock')) ||
    existsSync(join(projectRoot, 'bun.lockb'));

  let packageJson: { scripts?: Record<string, string> } = {};
  try {
    packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as typeof packageJson;
  } catch {
    return null;
  }

  const explicitBunTestScript = packageJson.scripts?.test?.trim() === 'bun test';

  if (hasBunLock || explicitBunTestScript) {
    return 'bun test';
  }

  return null;
}

/**
 * Scaffold the `.coda/` directory structure with default configuration.
 *
 * Creates:
 * - `.coda/`
 * - `.coda/coda.json` (with defaults)
 * - `.coda/state.json` (with default CODA state)
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

  const config = getDefaultConfig(projectRoot);
  writeFileSync(
    join(codaRoot, 'coda.json'),
    JSON.stringify(config, null, 2),
    'utf-8'
  );

  const defaultState = createDefaultState();
  persistState(defaultState, join(codaRoot, 'state.json'));

  return codaRoot;
}
