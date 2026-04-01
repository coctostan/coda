# v0.3 — Module System

**Goal:** Replace the hardcoded todd/walt prompt injection with a proper module infrastructure. Security and TDD modules fire at phase boundaries with structured findings. The `assumption` field enables false-positive resolution. Block thresholds gate advancement.

**Prerequisite:** v0.2 E2E passing (255 tests, autonomous loops working).

## What v0.3 Adds
2. **Module dispatcher** — assembles module prompts into phase context, parses findings from agent response
3. **Finding schema** — structured output with `assumption` field, validated by extension
4. **Block threshold checking** — findings above threshold block phase advancement (integrated into gate system)
5. **2 core modules** with real prompts: **security** and **tdd** (4 prompt files)
6. **Module config** in coda.json — enable/disable, block thresholds per module
7. **Findings persistence** — module findings written to disk per issue
## What v0.3.1 Adds (prompt files only, no infrastructure changes)

- Architecture module (2 prompt files)
- Quality module (3 prompt files)
- Knowledge module (2 prompt files)

## What v0.3 Does NOT Add
- Module eval engine / prompt improvement loop (v0.5)
- Per-project module overlays (.local.md) (v0.5)
- Remaining 20 modules (v0.6)
- Module-driven brownfield scanning (v0.4)

## What v0.3 Replaces

The v0.1/v0.2 hardcoded todd/walt module approach:
```typescript
// OLD (v0.1-v0.2): hardcoded prompts in modules/todd.ts, modules/walt.ts
function getModulePrompts(hookPoint: string): string[] { ... }

// NEW (v0.3): registry + dispatcher
const findings = await dispatcher.runHook('post-build', context);
if (findings.some(f => f.severity >= config.blockThreshold)) { block(); }
```

## Architecture

```
packages/core/src/modules/     # NEW — module infrastructure
├── registry.ts                # Load modules from config, resolve prompts
├── dispatcher.ts              # Run hooks, collect findings, check thresholds
├── finding-schema.ts          # Validate finding output shape
└── types.ts                   # Module, ModuleHook, Finding, HookPoint types

modules/                       # Shared module prompts (monorepo root)
├── prompts/
│   ├── security.md
│   ├── architecture.md
│   ├── tdd.md
│   ├── quality.md
│   └── knowledge.md
└── evals/                     # Eval cases (minimal for v0.3, grows over time)
    ├── security.json
    └── ...
```

## Integration with Existing Layers

The module system sits between tools (L3) and workflow (L4):

```
L4: Workflow ──calls──▶ Dispatcher ──runs──▶ Module hooks
                              │
                              ▼
                        Findings (structured)
                              │
                    ┌─────────┴──────────┐
                    │                    │
              Block threshold?     Persist to disk
                    │                    │
               YES: block          .coda/issues/{slug}/
               advancement         module-findings.json
```

## Build Order

| Phase | What | Depends On |
|-------|------|-----------|
| 1 | Core types + finding schema | — |
| 2 | Module registry | Phase 1 |
| 3 | Module dispatcher | Phases 1-2 |
| 4 | 2 module prompts: security (2 files) + tdd (3 files) | — |
| 5 | Workflow integration (hook dispatch at phase boundaries) | Phases 1-3 |
| 6 | Config integration (coda.json modules section) | Phase 2 |
| 7 | Findings persistence + context summarization | Phase 3 |
| 8 | E2E test | All |

## Key Design Decisions
From prior discussions + spec review — do not re-open:
1. **Modules are Tier 2 (structured evidence).** LLM does the analysis. Schema captures the evidence. Extension checks thresholds mechanically.
2. **`assumption` field on findings.** "What must be true for this to matter." Enables fast false-positive resolution.
3. **Module prompts are markdown data files, not TypeScript.** Live in `modules/prompts/`, not in source code.
4. **Todd and Walt are upgraded, not replaced.** Their v0.1 prompts become proper module prompts with finding schemas.
5. **Sessions are phase-based, not per-module.** Module prompts are injected into the phase session's context via before_agent_start. The agent produces all module findings in one response. No separate session per module.
6. **Post-build block = pause for human.** When module findings block advancement, automation pauses and the human decides. No automatic corrective session.
7. **Module blocks integrated into gate system.** `moduleBlockFindings` is added to `GateCheckData`. The `build→verify` gate checks both "all tasks complete" AND "no module blocks." Single authority for advancement.
8. **No-JSON fallback = zero findings + warning.** If the agent produces prose instead of JSON findings, treat as zero findings. Log a warning. Don't retry. Prompt quality is addressed via eval infrastructure in v0.5.
9. **Prompt files bundled with extension.** Registry takes an explicit `promptsDir` path configured at extension init. No relative path resolution from monorepo root at runtime.
10. **v0.3 ships 2 modules (security + tdd). v0.3.1 adds 3 more.** Infrastructure is the deliverable. Modules are prompt files dropped into a directory.

## Spec Files

- `01-types-and-schema.md` — Module, Finding, HookPoint types + finding validation
- `02-registry.md` — Module discovery, loading, config resolution
- `03-dispatcher.md` — Hook execution, finding collection, threshold checking
- `04-module-prompts.md` — The 5 core module prompts + hook mappings
- `05-integration.md` — Workflow hook dispatch, findings persistence, context summarization
- `E2E-TEST-SCRIPT-v0.3.md` — Live test: security module blocks on hardcoded secret
