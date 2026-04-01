# v0.3: Module Registry

**Package:** `@coda/core` → `src/modules/registry.ts`
**Depends on:** 01-types-and-schema

## Purpose

Discovers enabled modules, loads their definitions, resolves prompt file paths. The registry is the "what modules exist and are active" layer.

## How It Works

1. Read `coda.json` → `modules` section
2. For each enabled module, load its definition (name, hooks, blockThreshold)
3. Resolve prompt file paths (default prompts from the `modules/prompts/` directory)
4. Return the set of active modules

## Module Definitions

v0.3 ships 5 modules. Their definitions are hardcoded in the registry (not dynamically discovered from files — that's v0.6 extensibility territory).

```typescript
const MODULE_DEFINITIONS: Record<string, Omit<ModuleDefinition, 'enabled' | 'blockThreshold'>> = {
  security: {
    name: 'security',
    domain: 'Security Patterns',
    version: '1.0.0',
    hooks: [
      { hookPoint: 'pre-plan', priority: 80, promptFile: 'security/pre-plan.md' },
      { hookPoint: 'post-build', priority: 130, promptFile: 'security/post-build.md' },
    ],
  },
  architecture: {
    name: 'architecture',
    domain: 'Structural Integrity',
    version: '1.0.0',
    hooks: [
      { hookPoint: 'pre-plan', priority: 75, promptFile: 'architecture/pre-plan.md' },
      { hookPoint: 'post-build', priority: 125, promptFile: 'architecture/post-build.md' },
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
  quality: {
    name: 'quality',
    domain: 'Quality Baseline',
    version: '1.0.0',
    hooks: [
      { hookPoint: 'pre-build', priority: 100, promptFile: 'quality/pre-build.md' },
      { hookPoint: 'post-build', priority: 100, promptFile: 'quality/post-build.md' },
      { hookPoint: 'post-unify', priority: 100, promptFile: 'quality/post-unify.md' },
    ],
  },
  knowledge: {
    name: 'knowledge',
    domain: 'Knowledge Capture',
    version: '1.0.0',
    hooks: [
      { hookPoint: 'post-build', priority: 300, promptFile: 'knowledge/post-build.md' },
      { hookPoint: 'post-unify', priority: 200, promptFile: 'knowledge/post-unify.md' },
    ],
  },
};
```

## Registry API

```typescript
interface ModuleRegistry {
  /** Get all enabled modules */
  getEnabledModules(): ModuleDefinition[];

  /** Get modules that have hooks at a specific hook point, sorted by priority */
  getModulesForHook(hookPoint: HookPoint): ModuleDefinition[];

  /** Get a specific module by name */
  getModule(name: string): ModuleDefinition | null;

  /** Resolve the prompt file path for a module hook */
  resolvePromptPath(module: ModuleDefinition, hookPoint: HookPoint): string;
}
```

```typescript
function createRegistry(config: CodaConfig, promptsDir: string): ModuleRegistry {
  const enabledModules: ModuleDefinition[] = [];

  for (const [name, def] of Object.entries(MODULE_DEFINITIONS)) {
    const moduleConfig = config.modules?.[name];
    if (moduleConfig?.enabled !== false) {  // enabled by default if in MODULE_DEFINITIONS
      enabledModules.push({
        ...def,
        enabled: true,
        blockThreshold: moduleConfig?.blockThreshold ?? getDefaultThreshold(name),
      });
    }
  }

  return {
    getEnabledModules: () => enabledModules,
    getModulesForHook: (hp) =>
      enabledModules
        .filter(m => m.hooks.some(h => h.hookPoint === hp))
        .sort((a, b) => {
          const aP = a.hooks.find(h => h.hookPoint === hp)!.priority;
          const bP = b.hooks.find(h => h.hookPoint === hp)!.priority;
          return aP - bP;
        }),
    getModule: (name) => enabledModules.find(m => m.name === name) ?? null,
    resolvePromptPath: (mod, hp) => {
      const hook = mod.hooks.find(h => h.hookPoint === hp);
      return hook ? join(promptsDir, hook.promptFile) : '';
    },
  };
}
```

## Default Thresholds

```typescript
const DEFAULT_THRESHOLDS: Record<string, FindingSeverity> = {
  security: 'critical',
  architecture: 'high',
  tdd: 'high',
  quality: 'high',
  knowledge: 'none',   // knowledge never blocks — it's advisory
};
```

Note: `'none'` means no findings block. The module still produces findings; they're just never blocking.

## Config Shape

In `coda.json`:
```json
{
  "modules": {
    "security": { "enabled": true, "blockThreshold": "critical" },
    "architecture": { "enabled": true, "blockThreshold": "high" },
    "tdd": { "enabled": true, "blockThreshold": "high" },
    "quality": { "enabled": true, "blockThreshold": "high" },
    "knowledge": { "enabled": true }
  }
}
```

Omitting a module from config → uses defaults (enabled, default threshold).
Setting `"enabled": false` → module skipped entirely.

## Files

```
packages/core/src/modules/
├── registry.ts           # createRegistry, MODULE_DEFINITIONS, defaults
```

## Tests

1. All 5 modules load when config has all enabled
2. Disabled module excluded from getEnabledModules
3. getModulesForHook('pre-build') returns tdd + quality, sorted by priority
4. getModulesForHook('post-unify') returns quality + knowledge
5. getModulesForHook('pre-specify') returns empty (no v0.3 modules at this hook)
6. Config blockThreshold overrides default
7. Missing module config → uses defaults
8. resolvePromptPath returns correct path
