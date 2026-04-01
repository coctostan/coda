# Roadmap: coda-ecosystem

## Overview
A suite of Pi extensions for disciplined, agent-assisted software development.

## Current Milestone
**v0.3 Module System** (v0.3.0)
Status: 🚧 In Progress
Phases: 6 of 8 complete

| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 18 | Core Types + Finding Schema | 1/1 | ✅ Complete | 2026-04-01 |
| 19 | Module Registry | 1/1 | ✅ Complete | 2026-04-01 |
| 20 | Module Dispatcher | 1/1 | ✅ Complete | 2026-04-01 |
| 21 | Module Prompts — Security + TDD | 1/1 | ✅ Complete | 2026-04-01 |
| 22 | Workflow Integration | 1/1 | ✅ Complete | 2026-04-01 |
| 23 | Config Integration | 1/1 | ✅ Complete | 2026-04-01 |
| 24 | Findings Persistence + Context Summarization | TBD | Not started | - |
| 25 | E2E Validation | TBD | Not started | - |

### Phase 18: Core Types + Finding Schema
Focus: HookPoint, ModuleDefinition, FindingSeverity, Finding, HookResult types + validateFinding/validateFindings in @coda/core src/modules/
Spec: docs/v0.3/01-types-and-schema.md
Plans: TBD (defined during /paul:plan)

### Phase 19: Module Registry
Focus: createRegistry, MODULE_DEFINITIONS (security + tdd only), getEnabledModules/getModulesForHook/getModule/resolvePromptPath
Spec: docs/v0.3/02-registry.md
Plans: TBD (defined during /paul:plan)

### Phase 20: Module Dispatcher
Focus: Two-method API — assemblePrompts() + parseAndCheckFindings(). Dispatcher never touches sessions. exceedsThreshold helper.
Spec: docs/v0.3/03-dispatcher.md
Plans: TBD (defined during /paul:plan)

### Phase 21: Module Prompts — Security + TDD
Focus: 5 prompt files — security/pre-plan.md, security/post-build.md, tdd/pre-build.md, tdd/post-task.md, tdd/post-build.md
Spec: docs/v0.3/04-module-prompts.md
Plans: TBD (defined during /paul:plan)

### Phase 22: Workflow Integration
Focus: Wire dispatcher into phase boundaries, moduleBlockFindings in GateCheckData, delete old todd/walt system, update build-loop/phase-runner/coda-advance
Spec: docs/v0.3/05-integration.md
Plans: TBD (defined during /paul:plan)

### Phase 23: Config Integration
Focus: coda.json modules section — enable/disable per module, blockThreshold override per project
Spec: docs/v0.3/02-registry.md (config section)
Plans: TBD (defined during /paul:plan)

### Phase 24: Findings Persistence + Context Summarization
Focus: .coda/issues/{slug}/module-findings.json persistence, summarizeFindings for cross-phase context
Spec: docs/v0.3/05-integration.md (persistence section)
Plans: TBD (defined during /paul:plan)

### Phase 25: E2E Validation
Focus: 7 live scenarios — security blocks, findings persistence, human override, TDD at boundaries, module disable, clean lifecycle
Spec: docs/v0.3/E2E-TEST-SCRIPT-v0.3.md (scoped to security + tdd)
Plans: TBD (defined during /paul:plan)

### Resolved Design Decisions (v0.3)
| # | Decision | Resolution |
|---|----------|------------|
| D1 | 'none' threshold type | blockThreshold: FindingSeverity \| 'none' |
| D2 | Dispatcher API shape | Two methods: assemblePrompts() + parseAndCheckFindings() |
| D3 | Module definitions in v0.3 | Only 2 (security + tdd). Other 3 added in v0.3.1. |
| D4 | todd/walt migration | Single clean cut in workflow integration phase |
| D5 | moduleBlockFindings wiring | Workflow stores post-build results, passes count to GateCheckData |
## Completed Milestones

<details>
<summary>v0.2 Autonomous Loops — 2026-04-01 (9 phases, 10 plans)</summary>

| Phase | Name | Plans | Completed |
|-------|------|-------|-----------|
| 9 | State Submodes + Loop Tracking | 1/1 | 2026-03-29 |
| 10 | Review Runner | 1/1 | 2026-03-29 |
| 11 | Verify Runner + Correction Tasks | 1/1 | 2026-03-29 |
| 12 | Human Review Gate | 1/1 | 2026-03-29 |
| 13 | Exhaustion Handling + Rewind/Kill Controls | 1/1 | 2026-03-29 |
| 14 | Pi Integration Updates | 1/1 | 2026-03-29 |
| 15 | E2E Validation | 1/1 | 2026-03-29 |
| 16 | Live Operator Trigger Resolution | 1/1 | 2026-03-30 |
| 17 | Repeat Live E2E Validation | 1/1 + 1 fix | 2026-03-31 |

</details>

<details>
<summary>v0.1 Initial Release — 2026-03-29 (8 phases, 9 plans)</summary>

| Phase | Name | Plans | Completed |
|-------|------|-------|-----------|
| 1 | M1: Data Layer | 1/1 | 2026-03-28 |
| 2 | M2: State Engine | 1/1 | 2026-03-28 |
| 3 | M3: Tool Layer | 2/2 | 2026-03-28 |
| 4 | M4: Two Modules | 1/1 | 2026-03-28 |
| 5 | M5: Greenfield FORGE | 1/1 | 2026-03-28 |
| 6 | M6: Workflow Engine | 1/1 | 2026-03-28 |
| 7 | M7: Pi Integration | 1/1 | 2026-03-28 |
| 8 | E2E Test | 1/1 | 2026-03-28 |

</details>

## Milestone Notes
- v0.2 archive: `.paul/milestones/v0.2.0-ROADMAP.md`
- v0.1 archive: `.paul/milestones/v0.1.0-ROADMAP.md`
- Milestone history: `.paul/MILESTONES.md`

---
*Roadmap updated: 2026-04-01 — v0.3 Module System milestone created*
