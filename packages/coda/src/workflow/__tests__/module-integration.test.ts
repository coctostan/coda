import { describe, test, expect, afterEach } from 'bun:test';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createModuleSystem,
  buildHookContext,
  getModulePromptForHook,
  loadModuleConfig,
} from '../module-integration';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..', '..', '..', '..');
const promptsDir = resolve(repoRoot, 'modules', 'prompts');

describe('createModuleSystem', () => {
  test('returns a ModuleDispatcher with assemblePrompts and parseAndCheckFindings', () => {
    const dispatcher = createModuleSystem({}, promptsDir);
    expect(typeof dispatcher.assemblePrompts).toBe('function');
    expect(typeof dispatcher.parseAndCheckFindings).toBe('function');
  });

  test('dispatcher assembles non-empty prompt for pre-build (tdd module)', () => {
    const dispatcher = createModuleSystem({}, promptsDir);
    const context = buildHookContext('test-issue', 'build');
    const prompt = dispatcher.assemblePrompts('pre-build', context);
    expect(prompt.length).toBeGreaterThan(0);
    expect(prompt).toContain('TDD');
  });

  test('dispatcher returns empty string for hook with no modules', () => {
    const dispatcher = createModuleSystem({}, promptsDir);
    const context = buildHookContext('test-issue', 'build');
    // post-unify has no modules in v0.3
    const prompt = dispatcher.assemblePrompts('post-unify', context);
    expect(prompt).toBe('');
  });

  test('disabled module produces no prompt', () => {
    const dispatcher = createModuleSystem(
      { modules: { tdd: { enabled: false } } },
      promptsDir
    );
    const context = buildHookContext('test-issue', 'build');
    const prompt = dispatcher.assemblePrompts('pre-build', context);
    // Only tdd fires at pre-build; with it disabled, should be empty
    expect(prompt).toBe('');
  });
});

describe('buildHookContext', () => {
  test('produces context with required fields', () => {
    const ctx = buildHookContext('my-issue', 'build');
    expect(ctx.issueSlug).toBe('my-issue');
    expect(ctx.phase).toBe('build');
    expect(ctx.submode).toBeNull();
  });

  test('includes optional fields when provided', () => {
    const ctx = buildHookContext('my-issue', 'build', {
      submode: 'review',
      changedFiles: ['src/foo.ts'],
      taskId: 3,
      planPath: '/path/to/plan.md',
    });
    expect(ctx.submode).toBe('review');
    expect(ctx.changedFiles).toEqual(['src/foo.ts']);
    expect(ctx.taskId).toBe(3);
    expect(ctx.planPath).toBe('/path/to/plan.md');
  });

  test('defaults submode to null when not provided', () => {
    const ctx = buildHookContext('slug', 'plan', {});
    expect(ctx.submode).toBeNull();
  });
});

describe('getModulePromptForHook', () => {
  test('returns non-empty string for pre-build (tdd module active)', () => {
    const prompt = getModulePromptForHook('pre-build', 'test-issue', 'build', {
      promptsDir,
    });
    expect(prompt.length).toBeGreaterThan(0);
    expect(prompt).toContain('TDD');
  });

  test('returns non-empty string for pre-plan (security module active)', () => {
    const prompt = getModulePromptForHook('pre-plan', 'test-issue', 'plan', {
      promptsDir,
    });
    expect(prompt.length).toBeGreaterThan(0);
    expect(prompt).toContain('Security');
  });

  test('returns empty string for hookPoint with no modules', () => {
    const prompt = getModulePromptForHook('post-unify', 'test-issue', 'unify', {
      promptsDir,
    });
    expect(prompt).toBe('');
  });

  test('includes taskId in context when provided', () => {
    const prompt = getModulePromptForHook('post-task', 'test-issue', 'build', {
      promptsDir,
      taskId: 5,
    });
    // post-task has tdd module — prompt should include task reference
    expect(prompt.length).toBeGreaterThan(0);
    expect(prompt).toContain('Task: 5');
  });
});

describe('loadModuleConfig', () => {
  const tmpDir = resolve(__dirname, '__tmp_config_test__');
  const codaDir = resolve(tmpDir, '.coda');

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test('returns empty config when coda.json does not exist', () => {
    const config = loadModuleConfig('/nonexistent/path');
    expect(config).toEqual({});
  });

  test('returns empty config when coda.json has no modules field', () => {
    mkdirSync(codaDir, { recursive: true });
    writeFileSync(resolve(codaDir, 'coda.json'), JSON.stringify({ tdd_test_command: null }));
    const config = loadModuleConfig(codaDir);
    expect(config).toEqual({});
  });

  test('returns modules config from coda.json', () => {
    mkdirSync(codaDir, { recursive: true });
    writeFileSync(resolve(codaDir, 'coda.json'), JSON.stringify({
      modules: {
        security: { enabled: true, blockThreshold: 'high' },
        tdd: { enabled: false },
      },
    }));
    const config = loadModuleConfig(codaDir);
    expect(config.modules).toBeDefined();
    expect(config.modules!['security']!.enabled).toBe(true);
    expect(config.modules!['security']!.blockThreshold).toBe('high');
    expect(config.modules!['tdd']!.enabled).toBe(false);
  });

  test('treats missing enabled as true (enabled by default)', () => {
    mkdirSync(codaDir, { recursive: true });
    writeFileSync(resolve(codaDir, 'coda.json'), JSON.stringify({
      modules: { security: { blockThreshold: 'medium' } },
    }));
    const config = loadModuleConfig(codaDir);
    expect(config.modules!['security']!.enabled).toBe(true);
    expect(config.modules!['security']!.blockThreshold).toBe('medium');
  });
});

describe('getModulePromptForHook with codaRoot', () => {
  const tmpDir = resolve(__dirname, '__tmp_codaRoot_test__');
  const codaDir = resolve(tmpDir, '.coda');

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test('uses project config when codaRoot provided (tdd disabled → no pre-build prompt)', () => {
    mkdirSync(codaDir, { recursive: true });
    writeFileSync(resolve(codaDir, 'coda.json'), JSON.stringify({
      modules: { tdd: { enabled: false } },
    }));
    const prompt = getModulePromptForHook('pre-build', 'test-issue', 'build', {
      codaRoot: codaDir,
      promptsDir,
    });
    expect(prompt).toBe('');
  });

  test('uses project config when codaRoot provided (tdd enabled → has pre-build prompt)', () => {
    mkdirSync(codaDir, { recursive: true });
    writeFileSync(resolve(codaDir, 'coda.json'), JSON.stringify({
      modules: { tdd: { enabled: true } },
    }));
    const prompt = getModulePromptForHook('pre-build', 'test-issue', 'build', {
      codaRoot: codaDir,
      promptsDir,
    });
    expect(prompt.length).toBeGreaterThan(0);
    expect(prompt).toContain('TDD');
  });

  test('explicit config takes precedence over codaRoot', () => {
    mkdirSync(codaDir, { recursive: true });
    writeFileSync(resolve(codaDir, 'coda.json'), JSON.stringify({
      modules: { tdd: { enabled: true } },
    }));
    // Explicit config disables tdd, should override coda.json
    const prompt = getModulePromptForHook('pre-build', 'test-issue', 'build', {
      config: { modules: { tdd: { enabled: false } } },
      codaRoot: codaDir,
      promptsDir,
    });
    expect(prompt).toBe('');
  });
});

describe('scaffold defaults', () => {
  test('getDefaultConfig includes modules section with security and tdd', async () => {
    const { getDefaultConfig } = await import('../../forge/scaffold');
    const config = getDefaultConfig();
    expect(config.modules).toBeDefined();
    expect(config.modules!['security']).toEqual({ enabled: true, blockThreshold: 'critical' });
    expect(config.modules!['tdd']).toEqual({ enabled: true, blockThreshold: 'high' });
  });
});
