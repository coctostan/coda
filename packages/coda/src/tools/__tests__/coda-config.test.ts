import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { codaConfig, loadCodaConfig } from '../coda-config';
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

describe('loadCodaConfig migration', () => {
  let tempDir: string;
  let codaRoot: string;
  let configPath: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'coda-config-mig-'));
    codaRoot = join(tempDir, '.coda');
    mkdirSync(codaRoot, { recursive: true });
    configPath = join(codaRoot, 'coda.json');
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  /** Write a coda.json carrying legacy human_review_default but no gates. */
  function writeLegacyConfig(overrides: Record<string, unknown> = {}): void {
    const legacy: Record<string, unknown> = {
      tdd_test_command: null,
      full_suite_command: null,
      verification_commands: [],
      max_review_iterations: 3,
      max_verify_iterations: 3,
      tdd_gate: { feature: true, bugfix: true, refactor: true, chore: false, docs: false },
      human_review_default: { feature: true, bugfix: true, refactor: false, chore: false, docs: false },
      ...overrides,
    };
    writeFileSync(configPath, JSON.stringify(legacy, null, 2), 'utf-8');
  }

  test('migrates legacy config with human_review_default to gates', () => {
    writeLegacyConfig();
    const loaded = loadCodaConfig(codaRoot);
    expect(loaded).not.toBeNull();
    expect(loaded!.gates?.plan_review).toBe('human');
    expect((loaded! as unknown as Record<string, unknown>)['human_review_default']).toBeUndefined();

    const onDisk = JSON.parse(readFileSync(configPath, 'utf-8')) as Record<string, unknown>;
    expect(onDisk).toHaveProperty('gates');
    expect(onDisk).not.toHaveProperty('human_review_default');
  });

  test('migration is idempotent (second load does not rewrite)', () => {
    writeLegacyConfig();
    loadCodaConfig(codaRoot);
    const firstMtime = Bun.file(configPath).lastModified;

    // Small wait to ensure mtime resolution would detect a rewrite.
    Bun.sleepSync(20);

    loadCodaConfig(codaRoot);
    const secondMtime = Bun.file(configPath).lastModified;

    expect(secondMtime).toBe(firstMtime);
  });

  test('preserves existing gates when human_review_default is also present (stale)', () => {
    writeLegacyConfig({
      gates: { plan_review: 'auto', build_review: 'auto-unless-block', unify_review: 'human' },
    });
    const loaded = loadCodaConfig(codaRoot);
    expect(loaded!.gates?.plan_review).toBe('auto');

    const onDisk = JSON.parse(readFileSync(configPath, 'utf-8')) as Record<string, unknown>;
    expect(onDisk).not.toHaveProperty('human_review_default');
    expect((onDisk.gates as Record<string, string>).plan_review).toBe('auto');
  });

  test('no-op when config has no human_review_default (fresh config)', () => {
    writeFileSync(
      configPath,
      JSON.stringify(getDefaultConfig(), null, 2),
      'utf-8'
    );
    const beforeMtime = Bun.file(configPath).lastModified;
    Bun.sleepSync(20);

    loadCodaConfig(codaRoot);
    const afterMtime = Bun.file(configPath).lastModified;
    expect(afterMtime).toBe(beforeMtime);
  });

  test('returns null when coda.json does not exist', () => {
    expect(loadCodaConfig(codaRoot)).toBeNull();
  });

  test('coda_config set rejects "human_review_default" as an unknown key', () => {
    writeFileSync(configPath, JSON.stringify(getDefaultConfig(), null, 2), 'utf-8');
    const result = codaConfig(
      { action: 'set', key: 'human_review_default', value: { feature: true } },
      codaRoot
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Unknown top-level config key: human_review_default');
    }
  });

  test('coda_config get on a legacy config returns migrated shape', () => {
    writeLegacyConfig();
    const result = codaConfig({ action: 'get', key: 'gates.plan_review' }, codaRoot);
    expect(result.success).toBe(true);
    if (result.success && 'value' in result) {
      expect(result.value).toBe('human');
    }
  });
});
