/**
 * @module tools/coda-config
 * Read and update `.coda/coda.json` project configuration.
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { CodaConfig } from '../forge/types';

const VALID_CONFIG_KEYS = [
  'tdd_test_command',
  'full_suite_command',
  'verification_commands',
  'max_review_iterations',
  'max_verify_iterations',
  'tdd_gate',
  'human_review_default',
  'modules',
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

function loadConfig(codaRoot: string):
  | { success: true; config: CodaConfig; configPath: string }
  | ConfigErrorResult {
  const configPath = join(codaRoot, 'coda.json');
  if (!existsSync(configPath)) {
    return {
      success: false,
      error: `coda.json not found at ${configPath}`,
    };
  }

  try {
    return {
      success: true,
      config: JSON.parse(readFileSync(configPath, 'utf-8')) as CodaConfig,
      configPath,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Failed to read coda.json: ${message}`,
    };
  }
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
