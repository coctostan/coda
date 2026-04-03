import { describe, test, expect } from 'bun:test';
import { createRegistry, MODULE_DEFINITIONS, DEFAULT_THRESHOLDS } from '../registry';
import type { RegistryConfig } from '../registry';

describe('createRegistry', () => {
  const promptsDir = '/prompts';

  test('all v0.3.1 modules load when config enables them', () => {
    const config: RegistryConfig = {};
    const registry = createRegistry(config, promptsDir);
    const modules = registry.getEnabledModules();

    expect(modules).toHaveLength(5);

    const security = modules.find((m) => m.name === 'security');
    expect(security).toBeDefined();
    expect(security!.domain).toBe('Security Patterns');
    expect(security!.version).toBe('1.0.0');
    expect(security!.enabled).toBe(true);
    expect(security!.blockThreshold).toBe('critical');
    expect(security!.hooks).toHaveLength(3);

    const tdd = modules.find((m) => m.name === 'tdd');
    expect(tdd).toBeDefined();
    expect(tdd!.domain).toBe('Test-Driven Development');
    expect(tdd!.version).toBe('1.0.0');
    expect(tdd!.enabled).toBe(true);
    expect(tdd!.blockThreshold).toBe('high');
    expect(tdd!.hooks).toHaveLength(4);

    const architecture = modules.find((m) => m.name === 'architecture');
    expect(architecture).toBeDefined();
    expect(architecture!.domain).toBe('Architecture Patterns');
    expect(architecture!.blockThreshold).toBe('high');
    expect(architecture!.hooks).toHaveLength(3);

    const quality = modules.find((m) => m.name === 'quality');
    expect(quality).toBeDefined();
    expect(quality!.domain).toBe('Quality Assurance');
    expect(quality!.blockThreshold).toBe('high');
    expect(quality!.hooks).toHaveLength(4);

    const knowledge = modules.find((m) => m.name === 'knowledge');
    expect(knowledge).toBeDefined();
    expect(knowledge!.domain).toBe('Knowledge Capture');
    expect(knowledge!.blockThreshold).toBe('none');
    expect(knowledge!.hooks).toHaveLength(3);
  });

  test('disabled module excluded from getEnabledModules', () => {
    const config: RegistryConfig = {
      modules: {
        security: { enabled: false },
      },
    };
    const registry = createRegistry(config, promptsDir);
    const modules = registry.getEnabledModules();

    expect(modules).toHaveLength(4);
    expect(modules[0]!.name).toBe('tdd');
    expect(registry.getModule('security')).toBeNull();
  });

  test('getModulesForHook returns correct modules sorted by priority', () => {
    const registry = createRegistry({}, promptsDir);

    // post-build: quality (100), architecture (125), security (130), tdd (200), knowledge (300)
    const postBuild = registry.getModulesForHook('post-build');
    expect(postBuild).toHaveLength(5);
    expect(postBuild[0]!.name).toBe('quality');
    expect(postBuild[1]!.name).toBe('architecture');
    expect(postBuild[2]!.name).toBe('security');
    expect(postBuild[3]!.name).toBe('tdd');
    expect(postBuild[4]!.name).toBe('knowledge');
  });

  test('getModulesForHook returns single module for hook-specific points', () => {
    const registry = createRegistry({}, promptsDir);

    // pre-build: tdd (100), quality (100)
    const preBuild = registry.getModulesForHook('pre-build');
    expect(preBuild).toHaveLength(2);
    expect(preBuild[0]!.name).toBe('tdd');
    expect(preBuild[1]!.name).toBe('quality');

    // pre-plan: architecture (75), security (80)
    const prePlan = registry.getModulesForHook('pre-plan');
    expect(prePlan).toHaveLength(2);
    expect(prePlan[0]!.name).toBe('architecture');
    expect(prePlan[1]!.name).toBe('security');
  });

  test('getModulesForHook returns empty for unused hook points', () => {
    const registry = createRegistry({}, promptsDir);
    expect(registry.getModulesForHook('pre-specify')).toHaveLength(0);
  });

  test('getModulesForHook returns all 5 modules for init-scan sorted by priority', () => {
    const registry = createRegistry({}, promptsDir);

    const initScan = registry.getModulesForHook('init-scan');
    expect(initScan).toHaveLength(5);
    // architecture (50) < security (100) <= tdd (100) <= quality (100) < knowledge (200)
    expect(initScan[0]!.name).toBe('architecture');
    expect(initScan[initScan.length - 1]!.name).toBe('knowledge');
  });

  test('init-scan promptFiles follow {module}/init-scan.md convention', () => {
    const registry = createRegistry({}, promptsDir);
    const initScan = registry.getModulesForHook('init-scan');

    for (const mod of initScan) {
      const path = registry.resolvePromptPath(mod, 'init-scan');
      expect(path).toBe(`/prompts/${mod.name}/init-scan.md`);
    }
  });

  test('config blockThreshold overrides default', () => {
    const config: RegistryConfig = {
      modules: {
        security: { enabled: true, blockThreshold: 'high' },
      },
    };
    const registry = createRegistry(config, promptsDir);
    const security = registry.getModule('security');

    expect(security).not.toBeNull();
    expect(security!.blockThreshold).toBe('high');
  });

  test('missing module config uses defaults', () => {
    const registry = createRegistry({}, promptsDir);
    expect(registry.getModule('security')!.blockThreshold).toBe('critical');
    expect(registry.getModule('tdd')!.blockThreshold).toBe('high');
    expect(registry.getModule('architecture')!.blockThreshold).toBe('high');
    expect(registry.getModule('quality')!.blockThreshold).toBe('high');
    expect(registry.getModule('knowledge')!.blockThreshold).toBe('none');
  });

  test('resolvePromptPath returns correct path', () => {
    const registry = createRegistry({}, promptsDir);
    const security = registry.getModule('security')!;
    const tdd = registry.getModule('tdd')!;

    // Security pre-plan
    expect(registry.resolvePromptPath(security, 'pre-plan')).toBe(
      '/prompts/security/pre-plan.md'
    );

    // Security post-build
    expect(registry.resolvePromptPath(security, 'post-build')).toBe(
      '/prompts/security/post-build.md'
    );

    // TDD pre-build
    expect(registry.resolvePromptPath(tdd, 'pre-build')).toBe(
      '/prompts/tdd/pre-build.md'
    );

    // Hook not on this module → empty string
    expect(registry.resolvePromptPath(security, 'post-task')).toBe('');
  });
});

describe('MODULE_DEFINITIONS', () => {
  test('contains all 5 modules', () => {
    const names = Object.keys(MODULE_DEFINITIONS);
    expect(names).toHaveLength(5);
    expect(names).toContain('security');
    expect(names).toContain('tdd');
    expect(names).toContain('architecture');
    expect(names).toContain('quality');
    expect(names).toContain('knowledge');
  });
});

describe('DEFAULT_THRESHOLDS', () => {
  test('all modules have correct default thresholds', () => {
    expect(DEFAULT_THRESHOLDS['security']).toBe('critical');
    expect(DEFAULT_THRESHOLDS['tdd']).toBe('high');
    expect(DEFAULT_THRESHOLDS['architecture']).toBe('high');
    expect(DEFAULT_THRESHOLDS['quality']).toBe('high');
    expect(DEFAULT_THRESHOLDS['knowledge']).toBe('none');
  });
});