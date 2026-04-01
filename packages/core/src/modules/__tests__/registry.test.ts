import { describe, test, expect } from 'bun:test';
import { createRegistry, MODULE_DEFINITIONS, DEFAULT_THRESHOLDS } from '../registry';
import type { RegistryConfig } from '../registry';

describe('createRegistry', () => {
  const promptsDir = '/prompts';

  test('both v0.3 modules load when config enables them', () => {
    const config: RegistryConfig = {};
    const registry = createRegistry(config, promptsDir);
    const modules = registry.getEnabledModules();

    expect(modules).toHaveLength(2);

    const security = modules.find((m) => m.name === 'security');
    expect(security).toBeDefined();
    expect(security!.domain).toBe('Security Patterns');
    expect(security!.version).toBe('1.0.0');
    expect(security!.enabled).toBe(true);
    expect(security!.blockThreshold).toBe('critical');
    expect(security!.hooks).toHaveLength(2);

    const tdd = modules.find((m) => m.name === 'tdd');
    expect(tdd).toBeDefined();
    expect(tdd!.domain).toBe('Test-Driven Development');
    expect(tdd!.version).toBe('1.0.0');
    expect(tdd!.enabled).toBe(true);
    expect(tdd!.blockThreshold).toBe('high');
    expect(tdd!.hooks).toHaveLength(3);
  });

  test('disabled module excluded from getEnabledModules', () => {
    const config: RegistryConfig = {
      modules: {
        security: { enabled: false },
      },
    };
    const registry = createRegistry(config, promptsDir);
    const modules = registry.getEnabledModules();

    expect(modules).toHaveLength(1);
    expect(modules[0]!.name).toBe('tdd');
    expect(registry.getModule('security')).toBeNull();
  });

  test('getModulesForHook returns correct modules sorted by priority', () => {
    const registry = createRegistry({}, promptsDir);

    // post-build: security (130) then tdd (200)
    const postBuild = registry.getModulesForHook('post-build');
    expect(postBuild).toHaveLength(2);
    expect(postBuild[0]!.name).toBe('security');
    expect(postBuild[1]!.name).toBe('tdd');
  });

  test('getModulesForHook returns single module for hook-specific points', () => {
    const registry = createRegistry({}, promptsDir);

    // pre-build: only tdd
    const preBuild = registry.getModulesForHook('pre-build');
    expect(preBuild).toHaveLength(1);
    expect(preBuild[0]!.name).toBe('tdd');

    // pre-plan: only security
    const prePlan = registry.getModulesForHook('pre-plan');
    expect(prePlan).toHaveLength(1);
    expect(prePlan[0]!.name).toBe('security');
  });

  test('getModulesForHook returns empty for unused hook points', () => {
    const registry = createRegistry({}, promptsDir);

    expect(registry.getModulesForHook('pre-specify')).toHaveLength(0);
    expect(registry.getModulesForHook('init-scan')).toHaveLength(0);
    expect(registry.getModulesForHook('post-unify')).toHaveLength(0);
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
  test('contains exactly security and tdd', () => {
    const names = Object.keys(MODULE_DEFINITIONS);
    expect(names).toHaveLength(2);
    expect(names).toContain('security');
    expect(names).toContain('tdd');
  });
});

describe('DEFAULT_THRESHOLDS', () => {
  test('security defaults to critical, tdd defaults to high', () => {
    expect(DEFAULT_THRESHOLDS['security']).toBe('critical');
    expect(DEFAULT_THRESHOLDS['tdd']).toBe('high');
  });
});
