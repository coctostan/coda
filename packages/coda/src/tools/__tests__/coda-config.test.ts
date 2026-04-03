import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { codaConfig } from '../coda-config';
import { getDefaultConfig } from '../../forge/scaffold';
import type { CodaConfig } from '../../forge/types';

describe('codaConfig', () => {
  let tempDir: string;
  let codaRoot: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'coda-config-'));
    codaRoot = join(tempDir, '.coda');
    mkdirSync(codaRoot, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  function writeConfig(config: CodaConfig = getDefaultConfig()): void {
    writeFileSync(join(codaRoot, 'coda.json'), JSON.stringify(config, null, 2), 'utf-8');
  }

  test('get returns full config', () => {
    const config = getDefaultConfig();
    writeConfig(config);

    const result = codaConfig({ action: 'get' }, codaRoot);

    expect(result).toEqual({ success: true, config });
  });

  test('get with key returns a specific top-level value', () => {
    writeConfig();

    const result = codaConfig({ action: 'get', key: 'tdd_test_command' }, codaRoot);

    expect(result).toEqual({ success: true, value: null });
  });

  test('get with dot-path returns a nested value', () => {
    writeConfig();

    const result = codaConfig({ action: 'get', key: 'modules.security.enabled' }, codaRoot);

    expect(result).toEqual({ success: true, value: true });
  });

  test('set updates a top-level key', () => {
    writeConfig();

    const result = codaConfig({ action: 'set', key: 'tdd_test_command', value: 'bun test' }, codaRoot);
    const updatedConfig = JSON.parse(readFileSync(join(codaRoot, 'coda.json'), 'utf-8')) as CodaConfig;

    expect(result).toEqual({ success: true, updated: 'tdd_test_command', value: 'bun test' });
    expect(updatedConfig.tdd_test_command).toBe('bun test');
  });

  test('set updates a dot-path key', () => {
    writeConfig();

    const result = codaConfig({ action: 'set', key: 'modules.security.enabled', value: false }, codaRoot);
    const updatedConfig = JSON.parse(readFileSync(join(codaRoot, 'coda.json'), 'utf-8')) as CodaConfig;

    expect(result).toEqual({ success: true, updated: 'modules.security.enabled', value: false });
    expect(updatedConfig.modules?.security?.enabled).toBe(false);
  });

  test('set rejects an unknown top-level key', () => {
    writeConfig();

    const result = codaConfig({ action: 'set', key: 'unknown_key', value: 'x' }, codaRoot);

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected set to fail for an unknown top-level key');
    }
    expect(result.error).toContain('Unknown top-level config key: unknown_key');
    expect(result.error).toContain('tdd_test_command');
    expect(result.error).toContain('modules');
  });

  test('set preserves other keys', () => {
    const config = getDefaultConfig();
    writeConfig(config);

    codaConfig({ action: 'set', key: 'tdd_test_command', value: 'bun test' }, codaRoot);

    const updatedConfig = JSON.parse(readFileSync(join(codaRoot, 'coda.json'), 'utf-8')) as CodaConfig;
    expect(updatedConfig.full_suite_command).toBe(config.full_suite_command);
    expect(updatedConfig.verification_commands).toEqual(config.verification_commands);
    expect(updatedConfig.max_review_iterations).toBe(config.max_review_iterations);
    expect(updatedConfig.modules).toEqual(config.modules);
  });

  test('returns an error when coda.json is missing', () => {
    const result = codaConfig({ action: 'get' }, codaRoot);

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected get to fail when coda.json is missing');
    }
    expect(result.error).toContain('coda.json');
  });
});
