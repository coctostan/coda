/**
 * @module modules/registry
 * Module registry — discovers enabled modules, resolves definitions,
 * and provides lookup by hook point.
 *
 * v0.3 ships 2 module definitions: security and tdd.
 * Definitions are hardcoded (dynamic discovery is v0.6).
 *
 * Dependency rule: L3 modules MUST NOT import from L1 (data) or L2 (state).
 */

import { join } from 'node:path';
import type {
  ModuleDefinition,
  ModuleConfig,
  FindingSeverity,
  HookPoint,
} from './types';

/**
 * Minimal config shape accepted by the registry.
 * Full coda.json parsing comes in Phase 23 — the registry only
 * needs the `modules` section.
 */
export interface RegistryConfig {
  /** Per-module enable/disable and threshold overrides. */
  modules?: Record<string, ModuleConfig>;
}

/**
 * The public API for querying active modules.
 */
export interface ModuleRegistry {
  /** Get all enabled modules. */
  getEnabledModules(): ModuleDefinition[];

  /** Get modules that have hooks at a specific hook point, sorted by priority (ascending). */
  getModulesForHook(hookPoint: HookPoint): ModuleDefinition[];

  /** Get a specific module by name, or null if not enabled. */
  getModule(name: string): ModuleDefinition | null;

  /** Resolve the absolute prompt file path for a module at a given hook point. Returns '' if module has no hook there. */
  resolvePromptPath(module: ModuleDefinition, hookPoint: HookPoint): string;
}

/**
 * v0.3 module definitions — security and tdd only (Decision D3).
 * Architecture, quality, and knowledge are added in v0.3.1.
 */
export const MODULE_DEFINITIONS: Record<
  string,
  Omit<ModuleDefinition, 'enabled' | 'blockThreshold'>
> = {
  security: {
    name: 'security',
    domain: 'Security Patterns',
    version: '1.0.0',
    hooks: [
      { hookPoint: 'pre-plan', priority: 80, promptFile: 'security/pre-plan.md' },
      { hookPoint: 'post-build', priority: 130, promptFile: 'security/post-build.md' },
    ],
  },
  tdd: {
    name: 'tdd',
    domain: 'Test-Driven Development',
    version: '1.0.0',
    hooks: [
      { hookPoint: 'pre-build', priority: 100, promptFile: 'tdd/pre-build.md' },
      { hookPoint: 'post-task', priority: 100, promptFile: 'tdd/post-task.md' },
      { hookPoint: 'post-build', priority: 200, promptFile: 'tdd/post-build.md' },
    ],
  },
} as const;

/**
 * Default block thresholds per module.
 * Config overrides take precedence via createRegistry.
 */
export const DEFAULT_THRESHOLDS: Record<string, FindingSeverity | 'none'> = {
  security: 'critical',
  tdd: 'high',
} as const;

/**
 * Create a module registry from config and a prompts directory path.
 *
 * Modules listed in MODULE_DEFINITIONS are enabled by default.
 * Set `config.modules.{name}.enabled = false` to disable.
 * Set `config.modules.{name}.blockThreshold` to override the default.
 *
 * @param config - Registry config with optional per-module overrides
 * @param promptsDir - Absolute path to the directory containing module prompt files
 * @returns A ModuleRegistry for querying active modules
 */
export function createRegistry(
  config: RegistryConfig,
  promptsDir: string
): ModuleRegistry {
  const enabledModules: ModuleDefinition[] = [];

  for (const [name, def] of Object.entries(MODULE_DEFINITIONS)) {
    const moduleConfig = config.modules?.[name];

    // Enabled by default if in MODULE_DEFINITIONS
    if (moduleConfig?.enabled === false) {
      continue;
    }

    enabledModules.push({
      ...def,
      enabled: true,
      blockThreshold:
        moduleConfig?.blockThreshold ?? DEFAULT_THRESHOLDS[name] ?? 'high',
    });
  }

  return {
    getEnabledModules: () => enabledModules,

    getModulesForHook: (hp: HookPoint) =>
      enabledModules
        .filter((m) => m.hooks.some((h) => h.hookPoint === hp))
        .sort((a, b) => {
          const aP = a.hooks.find((h) => h.hookPoint === hp)!.priority;
          const bP = b.hooks.find((h) => h.hookPoint === hp)!.priority;
          return aP - bP;
        }),

    getModule: (name: string) =>
      enabledModules.find((m) => m.name === name) ?? null,

    resolvePromptPath: (mod: ModuleDefinition, hp: HookPoint) => {
      const hook = mod.hooks.find((h) => h.hookPoint === hp);
      return hook ? join(promptsDir, hook.promptFile) : '';
    },
  };
}
