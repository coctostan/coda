/**
 * @module workflow/module-integration
 * Wire the v0.3 module dispatcher into the CODA workflow engine.
 *
 * Provides factory functions and helpers for creating a dispatcher,
 * building hook contexts, and assembling module prompts at phase boundaries.
 *
 * Also handles findings persistence and cross-phase summarization (Phase 24).
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
  HookResult,
  Finding,
} from '@coda/core';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';

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

    const validThresholds = new Set(['critical', 'high', 'medium', 'low', 'info', 'none']);
    const modules: Record<string, { enabled: boolean; blockThreshold?: FindingSeverity | 'none' }> = {};
    for (const [name, cfg] of Object.entries(raw.modules)) {
      const threshold = cfg.blockThreshold;
      modules[name] = {
        enabled: cfg.enabled !== false,
        ...(threshold && validThresholds.has(threshold)
          ? { blockThreshold: threshold as FindingSeverity | 'none' }
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
  const prompt = dispatcher.assemblePrompts(hookPoint as HookPoint, context);
  if (!prompt) {
    return '';
  }

  return [
    prompt,
    buildFindingsSubmissionInstruction(hookPoint),
  ].join('\n\n');
}

function buildFindingsSubmissionInstruction(hookPoint: string): string {
  return [
    '## Findings Submission',
    'After completing this module analysis, call `coda_report_findings` to persist the required findings for runtime gating and verify/unify context.',
    `Use \`hook_point: "${hookPoint}"\` and pass the same JSON array as \`findings_json\`.`,
    'Report findings even when no issues are found by submitting the required single info finding.',
  ].join('\n');
}

// ─── Findings Persistence (Phase 24) ────────────────────────────────────────

/** Shape of the persisted module findings file. */
export interface ModuleFindingsData {
  /** The issue slug these findings belong to. */
  issue: string;
  /** Accumulated hook results from all lifecycle phases. */
  hookResults: HookResult[];
}

/**
 * Persist a hook result to `.coda/issues/{slug}/module-findings.json`.
 *
 * Replaces any previously persisted result for the same hook point so runtime
 * gates only consider the latest findings for each lifecycle boundary.
 *
 * @param codaRoot - Path to the `.coda/` directory
 * @param issueSlug - The issue slug
 * @param hookResult - The hook result to persist
 */
export function persistFindings(
  codaRoot: string,
  issueSlug: string,
  hookResult: HookResult
): void {
  const dir = join(codaRoot, 'issues', issueSlug);
  const filePath = join(dir, 'module-findings.json');

  mkdirSync(dir, { recursive: true });

  let data: ModuleFindingsData;
  if (existsSync(filePath)) {
    try {
      data = JSON.parse(readFileSync(filePath, 'utf-8')) as ModuleFindingsData;
    } catch {
      data = { issue: issueSlug, hookResults: [] };
    }
  } else {
    data = { issue: issueSlug, hookResults: [] };
  }

  data.hookResults = [
    ...data.hookResults.filter((existingResult) => existingResult.hookPoint !== hookResult.hookPoint),
    hookResult,
  ];
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Load persisted module findings for an issue.
 *
 * Returns an empty structure if the file doesn't exist or is malformed.
 *
 * @param codaRoot - Path to the `.coda/` directory
 * @param issueSlug - The issue slug
 * @returns The persisted findings data
 */
export function loadFindings(
  codaRoot: string,
  issueSlug: string
): ModuleFindingsData {
  const filePath = join(codaRoot, 'issues', issueSlug, 'module-findings.json');
  if (!existsSync(filePath)) {
    return { issue: issueSlug, hookResults: [] };
  }

  try {
    return JSON.parse(readFileSync(filePath, 'utf-8')) as ModuleFindingsData;
  } catch {
    return { issue: issueSlug, hookResults: [] };
  }
}

/**
 * Produce a compact summary of module findings for cross-phase context.
 *
 * Groups findings by module, shows severity counts, and marks blocked modules.
 * Detail is included only for blocked or high+ severity findings.
 *
 * Example output:
 * `"security: 1 critical (BLOCKED) — Hardcoded API key in config.ts, 2 info | tdd: 3 medium"`
 *
 * @param hookResults - Array of HookResult to summarize
 * @returns Compact summary string, or '' if no findings
 */
export function summarizeFindings(hookResults: HookResult[]): string {
  // Collect all findings and track which modules had blocks
  const allFindings: Finding[] = [];
  const blockedModules = new Set<string>();

  for (const hr of hookResults) {
    for (const f of hr.findings) {
      allFindings.push(f);
    }
    for (const reason of hr.blockReasons) {
      // Block reasons start with "MODULE_NAME BLOCK: ..."
      const match = reason.match(/^(\S+)\s+BLOCK:/);
      if (match?.[1]) {
        blockedModules.add(match[1].toLowerCase());
      }
    }
  }

  if (allFindings.length === 0) return '';

  // Group by module
  const byModule = new Map<string, Finding[]>();
  for (const f of allFindings) {
    const existing = byModule.get(f.module) ?? [];
    existing.push(f);
    byModule.set(f.module, existing);
  }

  const severityOrder: FindingSeverity[] = ['critical', 'high', 'medium', 'low', 'info'];
  const parts: string[] = [];

  for (const [mod, findings] of byModule) {
    const counts = new Map<FindingSeverity, number>();
    const details: string[] = [];

    for (const f of findings) {
      counts.set(f.severity, (counts.get(f.severity) ?? 0) + 1);
      // Include detail for blocked or high+ severity
      if (f.severity === 'critical' || f.severity === 'high') {
        details.push(f.finding);
      }
    }

    const countParts: string[] = [];
    for (const sev of severityOrder) {
      const count = counts.get(sev);
      if (count && count > 0) {
        countParts.push(`${String(count)} ${sev}`);
      }
    }

    const blocked = blockedModules.has(mod);
    let summary = `${mod}: ${countParts.join(', ')}`;
    if (blocked) summary += ' (BLOCKED)';
    if (details.length > 0) summary += ` — ${details.join('; ')}`;

    parts.push(summary);
  }

  return parts.join(' | ');
}
