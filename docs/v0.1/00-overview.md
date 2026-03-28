# v0.1 MVP — Overview

**Goal:** One issue goes through the full lifecycle on a test project. Proves the core mechanics work.

## What v0.1 Does

1. `/coda forge` — minimal greenfield init (ask questions, produce ref-system.md + ref-prd.md, scaffold .coda/)
2. `/coda new` — create an issue
3. SPECIFY → PLAN → REVIEW → BUILD → VERIFY → UNIFY → DONE lifecycle
4. TDD write-gate (can't write production code without failing test)
5. `.coda/` write protection (all modifications through tools)
6. Feature branch per issue, commit per task
7. Two modules (TDD + quality baseline) injected at build boundaries

## What v0.1 Does NOT Do

- No review/revise autonomous loop (single-pass review only)
- No verify/correct autonomous loop (single-pass verify only)
- No brownfield onboarding
- No module infrastructure (registry, dispatcher, eval engine)
- No adaptive ceremony (all issues get the same flow)
- No context budget management
- No pause/resume/back/kill
- No UI dashboard
- No gate automation

## Architecture

```
coda/packages/
├── core/src/
│   ├── data/       # M1: mdbase wrapper, types, section reader
│   └── state/      # M2: state machine, gates, atomic persist
├── coda/src/
│   ├── tools/      # M3: coda_* tools + write-gate
│   ├── modules/    # M4: 2 PALS-derived modules (todd, walt)
│   ├── forge/      # M5: greenfield-only init flow
│   ├── workflow/   # M6: linear phase runner + build loop
│   └── pi/         # M7: extension entry, commands, hooks
```

## Build Order

Each milestone is a PALS phase. Build sequentially — each depends on the one before.

| Phase | Milestone | Depends On | Deliverable |
|-------|-----------|------------|-------------|
| 1 | M1: Data Layer | — | Can read/write mdbase records, parse sections |
| 2 | M2: State Engine | M1 | State machine transitions, gates pass/fail, atomic persist |
| 3 | M3: Tool Layer | M1, M2 | All coda_* tools work in isolation (unit testable) |
| 4 | M4: Two Modules | — | Todd + Walt prompts ready, injectable at hooks |
| 5 | M5: Greenfield FORGE | M1, M3 | `/coda forge` produces ref docs + scaffolds .coda/ |
| 6 | M6: Workflow Engine | M1-M4 | Phase runner, build loop, context injection |
| 7 | M7: Pi Integration | M1-M6 | Extension works in Pi, commands registered, hooks fire |
| 8 | E2E Test | M1-M7 | Full issue lifecycle on test project |

## Test Project

A simple TODO CLI tool in TypeScript:
- Commands: add, list, complete, delete
- Storage: JSON file
- Tests: vitest or bun test

Small enough to complete in one issue, complex enough to test the lifecycle.

## Files

Detailed specs per milestone:
- `01-data-layer.md` — M1 spec
- `02-state-engine.md` — M2 spec
- `03-tool-layer.md` — M3 spec
- `04-modules.md` — M4 spec (todd + walt)
- `05-forge-greenfield.md` — M5 spec
- `06-workflow-engine.md` — M6 spec
- `07-pi-integration.md` — M7 spec

Each file contains ONLY what's needed for v0.1 — not the full spec. The full spec lives in `docs/coda-spec-v7.md` as the north star.
