import { describe, test, expect, afterEach } from 'bun:test';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createModuleSystem,
  buildHookContext,
  getModulePromptForHook,
  loadModuleConfig,
  persistFindings,
  loadFindings,
  summarizeFindings,
} from '../module-integration';
import type { ModuleFindingsData } from '../module-integration';
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
    // pre-specify has no modules
    const prompt = dispatcher.assemblePrompts('pre-specify', context);
    expect(prompt).toBe('');
  });

  test('disabled module produces no prompt for that module', () => {
    const dispatcher = createModuleSystem(
      { modules: { tdd: { enabled: false }, quality: { enabled: false } } },
      promptsDir
    );
    const context = buildHookContext('test-issue', 'build');
    const prompt = dispatcher.assemblePrompts('pre-build', context);
    // Both tdd and quality fire at pre-build; with both disabled, should be empty
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
    const prompt = getModulePromptForHook('pre-specify', 'test-issue', 'build', {
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


  test('appends explicit findings submission instructions to active module prompts', () => {
    const prompt = getModulePromptForHook('post-build', 'test-issue', 'build', {
      promptsDir,
      changedFiles: ['src/main.ts'],
    });
    expect(prompt.length).toBeGreaterThan(0);
    expect(prompt).toContain('MUST call');
    expect(prompt).toContain('coda_report_findings');
    expect(prompt).toContain('hook_point');
    expect(prompt).toContain('- hook_point: "post-build" (use this exact value)');
    expect(prompt).toContain('findings_json');
    expect(prompt).toContain('"critical" | "high" | "medium" | "low" | "info"');
    expect(prompt).toContain('[{"check":"module_review","severity":"info","finding":"No issues found","assumption":"N/A"}]');
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

  test('uses project config when codaRoot provided (tdd+quality disabled → no pre-build prompt)', () => {
    mkdirSync(codaDir, { recursive: true });
    writeFileSync(resolve(codaDir, 'coda.json'), JSON.stringify({
      modules: { tdd: { enabled: false }, quality: { enabled: false } },
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
    // Explicit config disables both tdd and quality, should override coda.json
    const prompt = getModulePromptForHook('pre-build', 'test-issue', 'build', {
      config: { modules: { tdd: { enabled: false }, quality: { enabled: false } } },
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

import type { HookResult, Finding } from '@coda/core';

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    module: 'security',
    check: 'test check',
    severity: 'info',
    finding: 'Test finding',
    ...overrides,
  };
}

function makeHookResult(overrides: Partial<HookResult> = {}): HookResult {
  return {
    hookPoint: 'post-build',
    findings: [],
    blocked: false,
    blockReasons: [],
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

describe('persistFindings + loadFindings', () => {
  const tmpDir = resolve(__dirname, '__tmp_persist_test__');
  const codaDir = resolve(tmpDir, '.coda');

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test('persistFindings creates module-findings.json with correct structure', () => {
    const hr = makeHookResult({
      findings: [makeFinding({ severity: 'critical', finding: 'Hardcoded key' })],
      blocked: true,
      blockReasons: ['SECURITY BLOCK: Hardcoded key'],
    });
    persistFindings(codaDir, 'test-issue', hr);

    const data = loadFindings(codaDir, 'test-issue');
    expect(data.issue).toBe('test-issue');
    expect(data.hookResults).toHaveLength(1);
    expect(data.hookResults[0]!.blocked).toBe(true);
    expect(data.hookResults[0]!.findings).toHaveLength(1);
  });

  test('persistFindings appends to existing file', () => {
    const hr1 = makeHookResult({ hookPoint: 'pre-plan', findings: [makeFinding()] });
    const hr2 = makeHookResult({ hookPoint: 'post-build', findings: [makeFinding({ severity: 'high' })] });

    persistFindings(codaDir, 'test-issue', hr1);
    persistFindings(codaDir, 'test-issue', hr2);

    const data = loadFindings(codaDir, 'test-issue');
    expect(data.hookResults).toHaveLength(2);
    expect(data.hookResults[0]!.hookPoint).toBe('pre-plan');
    expect(data.hookResults[1]!.hookPoint).toBe('post-build');
  });

  test('loadFindings returns empty structure when file does not exist', () => {
    const data = loadFindings('/nonexistent/path', 'no-issue');
    expect(data.issue).toBe('no-issue');
    expect(data.hookResults).toHaveLength(0);
  });
});

describe('summarizeFindings', () => {
  test('returns empty string for no findings', () => {
    expect(summarizeFindings([])).toBe('');
  });

  test('returns empty string for hookResults with empty findings', () => {
    expect(summarizeFindings([makeHookResult()])).toBe('');
  });

  test('groups findings by module and shows severity counts', () => {
    const hr = makeHookResult({
      findings: [
        makeFinding({ module: 'security', severity: 'critical', finding: 'Key exposed' }),
        makeFinding({ module: 'security', severity: 'info', finding: 'Check done' }),
        makeFinding({ module: 'tdd', severity: 'medium', finding: 'Missing test' }),
      ],
    });
    const summary = summarizeFindings([hr]);
    expect(summary).toContain('security:');
    expect(summary).toContain('1 critical');
    expect(summary).toContain('1 info');
    expect(summary).toContain('tdd:');
    expect(summary).toContain('1 medium');
  });

  test('marks blocked modules with (BLOCKED)', () => {
    const hr = makeHookResult({
      findings: [
        makeFinding({ module: 'security', severity: 'critical', finding: 'API key' }),
      ],
      blocked: true,
      blockReasons: ['SECURITY BLOCK: API key found'],
    });
    const summary = summarizeFindings([hr]);
    expect(summary).toContain('(BLOCKED)');
  });

  test('includes detail for high+ severity findings', () => {
    const hr = makeHookResult({
      findings: [
        makeFinding({ module: 'security', severity: 'high', finding: 'SQL injection risk' }),
        makeFinding({ module: 'security', severity: 'info', finding: 'Check passed' }),
      ],
    });
    const summary = summarizeFindings([hr]);
    expect(summary).toContain('SQL injection risk');
    // info-level detail is NOT included inline
    expect(summary).not.toContain('Check passed');
  });

  test('separates modules with pipe', () => {
    const hr = makeHookResult({
      findings: [
        makeFinding({ module: 'security', severity: 'info' }),
        makeFinding({ module: 'tdd', severity: 'info' }),
      ],
    });
    const summary = summarizeFindings([hr]);
    expect(summary).toContain(' | ');
  });
});
