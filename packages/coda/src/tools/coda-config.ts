/**
 * @module tools/coda-config
 * Read and update `.coda/coda.json` project configuration.
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { CodaConfig } from '../forge/types';
import { DEFAULT_GATE_MODES } from '../workflow/gate-automation';

const VALID_CONFIG_KEYS = [
  'tdd_test_command',
  'full_suite_command',
  'verification_commands',
  'max_review_iterations',
  'max_verify_iterations',
  'tdd_gate',
  'modules',
  'gates',
  'gate_overrides',
] as const satisfies readonly (keyof CodaConfig)[];

const VALID_CONFIG_KEYS_TEXT = VALID_CONFIG_KEYS.join(', ');

type ValidConfigKey = (typeof VALID_CONFIG_KEYS)[number];

/** Input for coda_config. */
export interface ConfigInput {
  /** Whether to read or update the configuration file. */
  action: 'get' | 'set';
  /** Optional top-level key or dot-path under a known top-level key. */
  key?: string;
  /** Value to persist when action is `set`. */
  value?: unknown;
}

/** Successful result for reading the full config. */
export interface ConfigGetResult {
  success: true;
  config: CodaConfig;
}

/** Successful result for reading a specific config value. */
export interface ConfigValueResult {
  success: true;
  value: unknown;
}

/** Successful result for updating a config value. */
export interface ConfigSetResult {
  success: true;
  updated: string;
  value: unknown;
}

/** Error result for coda_config. */
export interface ConfigErrorResult {
  success: false;
  error: string;
}

/** Result from coda_config. */
export type ConfigResult =
  | ConfigGetResult
  | ConfigValueResult
  | ConfigSetResult
  | ConfigErrorResult;

/**
 * Read or update the project's `.coda/coda.json` configuration file.
 *
 * @param input - Action and optional key/value payload
 * @param codaRoot - Absolute path to the `.coda/` directory
 * @returns The requested config value, updated value, or an error result
 */
export function codaConfig(input: ConfigInput, codaRoot: string): ConfigResult {
  try {
    const loaded = loadConfig(codaRoot);
    if (!loaded.success) {
      return loaded;
    }

    if (input.action === 'get') {
      const keyPath = normalizeKeyPath(input.key);
      if (!keyPath) {
        return { success: true, config: loaded.config };
      }

      return {
        success: true,
        value: getValueAtPath(loaded.config, keyPath),
      };
    }

    const keyPath = normalizeKeyPath(input.key);
    if (!keyPath) {
      return {
        success: false,
        error: 'Config key is required for action "set"',
      };
    }

    if (!Object.prototype.hasOwnProperty.call(input, 'value')) {
      return {
        success: false,
        error: 'Config value is required for action "set"',
      };
    }

    const topLevelKey = getTopLevelKey(keyPath);
    if (!isValidConfigKey(topLevelKey)) {
      return {
        success: false,
        error: `Unknown top-level config key: ${topLevelKey}. Valid keys: ${VALID_CONFIG_KEYS_TEXT}`,
      };
    }

    const gateModeError = validateGateModeValue(keyPath, input.value);
    if (gateModeError) {
      return gateModeError;
    }
    const setResult = setValueAtPath(loaded.config, keyPath, input.value);
    if (setResult) {
      return setResult;
    }

    writeFileSync(loaded.configPath, JSON.stringify(loaded.config, null, 2), 'utf-8');
    return {
      success: true,
      updated: keyPath,
      value: input.value,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Shared loader for `.coda/coda.json`. Handles:
 *   - Missing file → null (caller decides on defaults).
 *   - Malformed JSON → null (fail-closed; caller decides).
 *   - Legacy `human_review_default` → migrate once to `gates`, rewrite file, return migrated.
 *
 * Idempotent: subsequent calls on an already-migrated file do NOT rewrite.
 *
 * This is the **single source of truth** for config loading across the codebase.
 * Previously duplicated across `coda-advance.ts`, `coda-status.ts`, `pi/commands.ts`,
 * and `workflow/review-runner.ts`. The narrower loader in `pi/tools.ts` (which
 * returns only test-command fields for `coda_run_tests`) intentionally stays put.
 */
export function loadCodaConfig(codaRoot: string): CodaConfig | null {
  const configPath = join(codaRoot, 'coda.json');
  if (!existsSync(configPath)) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(configPath, 'utf-8'));
  } catch {
    return null;
  }

  const migrated = migrateLegacyHumanReviewDefault(parsed, configPath);
  return migrated as CodaConfig;
}

/**
 * Migrate a legacy v0.8 config (carrying `human_review_default`) to the Phase 50+
 * shape (`gates`). The legacy field is always stripped from disk; `gates` is seeded
 * from `DEFAULT_GATE_MODES` only when absent (existing `gates` wins).
 *
 * The mapping is deliberately coarse: `human_review_default` was per-issue-type
 * (feature/bugfix/refactor/chore/docs → true/false), while `gates` is per-gate-point
 * (plan_review/build_review/unify_review → human/auto/auto-unless-block). These are
 * not 1:1 isomorphic. Seed with defaults; operators who relied on legacy per-type
 * semantics should add `gate_overrides.<type>.<gate>` post-migration.
 *
 * Rewrites the file only when a mutation occurred (guards idempotence).
 */
function migrateLegacyHumanReviewDefault(parsed: unknown, configPath: string): unknown {
  if (!isRecord(parsed) || !('human_review_default' in parsed)) {
    return parsed;
  }

  let didMutate = false;

  if (!parsed['gates']) {
    parsed['gates'] = { ...DEFAULT_GATE_MODES };
    didMutate = true;
  }

  delete parsed['human_review_default'];
  didMutate = true;

  if (didMutate) {
    writeFileSync(configPath, JSON.stringify(parsed, null, 2), 'utf-8');
  }

  return parsed;
}
function loadConfig(codaRoot: string):
  | { success: true; config: CodaConfig; configPath: string }
  | ConfigErrorResult {
  const configPath = join(codaRoot, 'coda.json');
  const config = loadCodaConfig(codaRoot);
  if (config === null) {
    if (!existsSync(configPath)) {
      return {
        success: false,
        error: `coda.json not found at ${configPath}`,
      };
    }
    return {
      success: false,
      error: `Failed to read coda.json at ${configPath}`,
    };
  }
  return { success: true, config, configPath };
}

function normalizeKeyPath(key?: string): string | undefined {
  const trimmedKey = key?.trim();
  return trimmedKey ? trimmedKey : undefined;
}

function getTopLevelKey(keyPath: string): string {
  const [topLevelKey = ''] = keyPath.split('.');
  return topLevelKey;
}

function isValidConfigKey(key: string): key is ValidConfigKey {
  return VALID_CONFIG_KEYS.includes(key as ValidConfigKey);
}

function getValueAtPath(config: CodaConfig, keyPath: string): unknown {
  let current: unknown = config;

  for (const segment of keyPath.split('.')) {
    if (!isRecord(current)) {
      return undefined;
    }
    current = current[segment];
  }

  return current;
}

function setValueAtPath(
  config: CodaConfig,
  keyPath: string,
  value: unknown
): ConfigErrorResult | undefined {
  const segments = keyPath.split('.');
  const lastSegment = segments[segments.length - 1];
  if (!lastSegment) {
    return {
      success: false,
      error: 'Config key is required for action "set"',
    };
  }

  let current: Record<string, unknown> = config as unknown as Record<string, unknown>;

  for (const segment of segments.slice(0, -1)) {
    const next = current[segment];
    if (next === undefined) {
      current[segment] = {};
      current = current[segment] as Record<string, unknown>;
      continue;
    }

    if (!isRecord(next)) {
      return {
        success: false,
        error: `Cannot set nested config path through non-object segment: ${segment}`,
      };
    }

    current = next;
  }

  current[lastSegment] = value;
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const VALID_GATE_MODES = ['human', 'auto', 'auto-unless-block'] as const;

/**
 * Validate gate mode values when setting gates or gate_overrides.
 * Returns a ConfigErrorResult if the value is invalid, undefined otherwise.
 */
function validateGateModeValue(
  keyPath: string,
  value: unknown
): ConfigErrorResult | undefined {
  const topKey = getTopLevelKey(keyPath);
  if (topKey !== 'gates' && topKey !== 'gate_overrides') {
    return undefined;
  }

  // Setting a single gate mode (e.g., gates.plan_review = 'auto')
  if (typeof value === 'string') {
    if (!VALID_GATE_MODES.includes(value as typeof VALID_GATE_MODES[number])) {
      return {
        success: false,
        error: `Invalid gate mode: "${value}". Valid modes: ${VALID_GATE_MODES.join(', ')}`,
      };
    }
    return undefined;
  }

  // Setting an object (e.g., gates = { plan_review: 'auto' })
  if (isRecord(value)) {
    for (const [k, v] of Object.entries(value)) {
      if (typeof v === 'string' && !VALID_GATE_MODES.includes(v as typeof VALID_GATE_MODES[number])) {
        return {
          success: false,
          error: `Invalid gate mode for "${k}": "${v}". Valid modes: ${VALID_GATE_MODES.join(', ')}`,
        };
      }
      // For gate_overrides, value can be { issueType: { gateName: mode } }
      if (topKey === 'gate_overrides' && isRecord(v)) {
        for (const [gk, gv] of Object.entries(v)) {
          if (typeof gv === 'string' && !VALID_GATE_MODES.includes(gv as typeof VALID_GATE_MODES[number])) {
            return {
              success: false,
              error: `Invalid gate mode for "${k}.${gk}": "${gv}". Valid modes: ${VALID_GATE_MODES.join(', ')}`,
            };
          }
        }
      }
    }
  }

  return undefined;
}