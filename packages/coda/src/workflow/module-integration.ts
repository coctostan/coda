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
} from '@coda/core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Resolve repo root from this file's location (packages/coda/src/workflow/). */
const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_PROMPTS_DIR = resolve(__dirname, '..', '..', '..', '..', 'modules', 'prompts');

/**
 * Create a configured module dispatcher from optional config and prompts directory.
 *
 * Modules listed in MODULE_DEFINITIONS are enabled by default.
 * Pass `config.modules.{name}.enabled = false` to disable specific modules.
 *
 * @param config - Optional registry config with per-module overrides
 * @param promptsDir - Optional absolute path to prompt files directory (defaults to repo-root/modules/prompts)
 * @returns A ModuleDispatcher for prompt assembly and finding parsing
 */
export function createModuleSystem(
  config?: RegistryConfig,
  promptsDir?: string
): ModuleDispatcher {
  const dir = promptsDir ?? DEFAULT_PROMPTS_DIR;
  const registry = createRegistry(config ?? {}, dir);
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
    submode?: string | null;
    changedFiles?: string[];
    taskId?: number;
    planPath?: string;
  }
): string {
  const dispatcher = createModuleSystem(options?.config, options?.promptsDir);
  const context = buildHookContext(issueSlug, phase, {
    submode: options?.submode,
    changedFiles: options?.changedFiles,
    taskId: options?.taskId,
    planPath: options?.planPath,
  });
  return dispatcher.assemblePrompts(hookPoint as HookPoint, context);
}
