/**
 * @module workflow/module-integration
 * Wire the v0.3 module dispatcher into the CODA workflow engine.
 *
 * Provides factory functions and helpers for creating a dispatcher,
 * building hook contexts, and assembling module prompts at phase boundaries.
 *
 * Does NOT handle findings persistence (Phase 24) or drive LLM sessions.
 */

import {
  createRegistry,
  createDispatcher,
} from '@coda/core';
import type {
  ModuleDispatcher,
  HookContext,
  HookPoint,
  RegistryConfig,
  FindingSeverity,
} from '@coda/core';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';

/** Resolve repo root from this file's location (packages/coda/src/workflow/). */
const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_PROMPTS_DIR = resolve(__dirname, '..', '..', '..', '..', 'modules', 'prompts');

/**
 * Load module configuration from a project's coda.json.
 *
 * Reads only the `modules` field from `.coda/coda.json` and converts it
 * to a RegistryConfig. Returns an empty config if the file doesn't exist
 * or has no modules section.
 *
 * @param codaRoot - Path to the `.coda/` directory
 * @returns RegistryConfig with per-module overrides from the project
 */
export function loadModuleConfig(codaRoot: string): RegistryConfig {
  const configPath = join(codaRoot, 'coda.json');
  if (!existsSync(configPath)) return {};

  try {
    const raw = JSON.parse(readFileSync(configPath, 'utf-8')) as {
      modules?: Record<string, { enabled?: boolean; blockThreshold?: string }>;
    };
    if (!raw.modules) return {};

    const modules: Record<string, { enabled: boolean; blockThreshold?: FindingSeverity | 'none' }> = {};
    for (const [name, cfg] of Object.entries(raw.modules)) {
      modules[name] = {
        enabled: cfg.enabled !== false,
        ...(cfg.blockThreshold
          ? { blockThreshold: cfg.blockThreshold as FindingSeverity | 'none' }
          : {}),
      };
    }
    return { modules };
  } catch {
    return {};
  }
}

/**
 * Create a configured module dispatcher from optional config and prompts directory.
 *
 * Modules listed in MODULE_DEFINITIONS are enabled by default.
 * Pass `config.modules.{name}.enabled = false` to disable specific modules.
 * When `codaRoot` is provided and `config` is not, config is loaded from coda.json.
 *
 * @param config - Optional registry config with per-module overrides
 * @param promptsDir - Optional absolute path to prompt files directory (defaults to repo-root/modules/prompts)
 * @param codaRoot - Optional path to `.coda/` directory for auto-loading config
 * @returns A ModuleDispatcher for prompt assembly and finding parsing
 */
export function createModuleSystem(
  config?: RegistryConfig,
  promptsDir?: string,
  codaRoot?: string
): ModuleDispatcher {
  const dir = promptsDir ?? DEFAULT_PROMPTS_DIR;
  const resolvedConfig = config ?? (codaRoot ? loadModuleConfig(codaRoot) : {});
  const registry = createRegistry(resolvedConfig, dir);
  return createDispatcher(registry);
}

/**
 * Build a HookContext from workflow parameters.
 *
 * @param issueSlug - The active issue slug
 * @param phase - Current lifecycle phase (e.g., 'plan', 'build')
 * @param options - Optional context fields: submode, changedFiles, taskId, planPath
 * @returns A fully populated HookContext
 */
export function buildHookContext(
  issueSlug: string,
  phase: string,
  options?: {
    submode?: string | null;
    changedFiles?: string[];
    taskId?: number;
    planPath?: string;
  }
): HookContext {
  return {
    issueSlug,
    phase,
    submode: options?.submode ?? null,
    changedFiles: options?.changedFiles,
    taskId: options?.taskId,
    planPath: options?.planPath,
  };
}

/**
 * Assemble module prompts for a given hook point in a single call.
 *
 * Convenience function that creates a dispatcher, builds context, and
 * returns the assembled prompt string. Returns '' if no modules fire.
 *
 * @param hookPoint - The lifecycle hook point (e.g., 'pre-build', 'pre-plan')
 * @param issueSlug - The active issue slug
 * @param phase - Current lifecycle phase
 * @param options - Optional fields for context and dispatcher configuration
 * @returns Assembled prompt string, or '' if no modules at this hook point
 */
export function getModulePromptForHook(
  hookPoint: string,
  issueSlug: string,
  phase: string,
  options?: {
    config?: RegistryConfig;
    promptsDir?: string;
    codaRoot?: string;
    submode?: string | null;
    changedFiles?: string[];
    taskId?: number;
    planPath?: string;
  }
): string {
  const resolvedConfig = options?.config ?? (options?.codaRoot ? loadModuleConfig(options.codaRoot) : undefined);
  const dispatcher = createModuleSystem(resolvedConfig, options?.promptsDir);
  const context = buildHookContext(issueSlug, phase, {
    submode: options?.submode,
    changedFiles: options?.changedFiles,
    taskId: options?.taskId,
    planPath: options?.planPath,
  });
  return dispatcher.assemblePrompts(hookPoint as HookPoint, context);
}
