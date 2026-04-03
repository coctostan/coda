/**
 * @module forge/brownfield
 * Brownfield SCAN orchestration for existing codebases.
 *
 * Identifies universal scan targets, detects the source directory,
 * and assembles init-scan module prompts. The agent acts on the
 * returned ScanContext to read files, run commands, and produce evidence.
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { createRegistry } from '@coda/core';
import type { RegistryConfig } from '@coda/core';
import { createDispatcher } from '@coda/core';

/**
 * Universal files to check for during brownfield scanning.
 * These are always scanned regardless of which modules are enabled.
 */
export const UNIVERSAL_SCAN_TARGETS: readonly string[] = [
  'README.md',
  'CONTRIBUTING.md',
  'AGENTS.md',
  'CLAUDE.md',
  'package.json',
  'Cargo.toml',
  'go.mod',
  'pyproject.toml',
] as const;

/**
 * Base commands to run for universal evidence gathering.
 * Dynamic commands (e.g., `find {sourceDir}`) are added by assembleScanContext.
 */
export const UNIVERSAL_COMMANDS: readonly string[] = [
  'git log --oneline -20',
  'ls -la',
] as const;

/** Candidate source directories, checked in priority order. */
const SOURCE_DIR_CANDIDATES = ['src', 'lib', 'app', 'cmd', 'pkg'] as const;

/**
 * The assembled scan context returned to the agent for brownfield FORGE.
 */
export interface ScanContext {
  /** Universal files that exist in the project. */
  universalTargets: string[];
  /** Detected source directory (src, lib, app, etc.) or null if none found. */
  sourceDir: string | null;
  /** Commands to run for universal evidence (including dynamic find command). */
  universalCommands: string[];
  /** Assembled init-scan prompts from all enabled modules. */
  modulePrompts: string;
}

/**
 * Get the universal scan target files that actually exist in the project.
 *
 * @param projectRoot - Absolute path to the project root
 * @returns Array of filenames (not full paths) that exist
 */
export function getUniversalScanTargets(projectRoot: string): string[] {
  return UNIVERSAL_SCAN_TARGETS.filter((f) => existsSync(join(projectRoot, f)));
}

/**
 * Detect the primary source directory in the project.
 * Checks candidates in priority order: src, lib, app, cmd, pkg.
 *
 * @param projectRoot - Absolute path to the project root
 * @returns The first matching directory name, or null if none found
 */
export function getSourceDirectory(projectRoot: string): string | null {
  for (const dir of SOURCE_DIR_CANDIDATES) {
    if (existsSync(join(projectRoot, dir))) {
      return dir;
    }
  }
  return null;
}

/**
 * Assemble the full scan context for brownfield FORGE.
 *
 * Identifies existing universal targets, detects the source directory,
 * builds the command list, and assembles init-scan module prompts via
 * the dispatcher.
 *
 * @param projectRoot - Absolute path to the project root
 * @param promptsDir - Absolute path to the module prompts directory
 * @param config - Optional registry config for module enable/disable
 * @returns ScanContext for the agent to act on
 */
export function assembleScanContext(
  projectRoot: string,
  promptsDir: string,
  config?: RegistryConfig
): ScanContext {
  const universalTargets = getUniversalScanTargets(projectRoot);
  const sourceDir = getSourceDirectory(projectRoot);

  // Build command list — add dynamic find command if source dir detected
  const universalCommands = [...UNIVERSAL_COMMANDS];
  if (sourceDir) {
    universalCommands.push(`find ${sourceDir} -type f | head -50`);
  }

  // Assemble init-scan prompts from all enabled modules
  const registry = createRegistry(config ?? {}, promptsDir);
  const dispatcher = createDispatcher(registry);
  const modulePrompts = dispatcher.assemblePrompts('init-scan', {
    issueSlug: 'forge-onboarding',
    phase: 'forge',
    submode: null,
  });

  return {
    universalTargets,
    sourceDir,
    universalCommands,
    modulePrompts,
  };
}
