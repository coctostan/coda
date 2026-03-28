# Roadmap: coda-ecosystem

## Overview
A suite of Pi extensions for disciplined, agent-assisted software development.

## Current Milestone
**v0.1 Initial Release** (v0.1.0)
Status: In progress
Phases: 6 of 8 complete

## Phases

| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 1 | M1: Data Layer | 1 | ✅ Complete | 2026-03-28 |
| 2 | M2: State Engine | 1 | ✅ Complete | 2026-03-28 |
| 3 | M3: Tool Layer | 2 | ✅ Complete | 2026-03-28 |
| 4 | M4: Two Modules | 1 | ✅ Complete | 2026-03-28 |
| 5 | M5: Greenfield FORGE | 1 | ✅ Complete | 2026-03-28 |
| 6 | M6: Workflow Engine | 1 | ✅ Complete | 2026-03-28 |
| 7 | M7: Pi Integration | TBD | 🔵 Next | - |
| 8 | E2E Test | TBD | Not started | - |

## Phase Details

### Phase 1: M1 — Data Layer
**Package:** `@coda/core` → `packages/core/src/data/`
**Depends on:** Nothing
**Deliverable:** Read/write mdbase-style markdown records with YAML frontmatter, parse sections
**Spec:** `docs/v0.1/01-data-layer.md`

### Phase 2: M2 — State Engine
**Package:** `@coda/core` → `packages/core/src/state/`
**Depends on:** M1
**Deliverable:** State machine transitions, gates pass/fail, atomic persist
**Spec:** `docs/v0.1/02-state-engine.md`

### Phase 3: M3 — Tool Layer
**Package:** `@coda/coda` → `packages/coda/src/tools/`
**Depends on:** M1, M2
**Deliverable:** All coda_* tools work in isolation (unit testable)
**Spec:** `docs/v0.1/03-tool-layer.md`

### Phase 4: M4 — Two Modules
**Package:** `@coda/coda` → modules/
**Depends on:** —
**Deliverable:** Todd + Walt prompts ready, injectable at hooks
**Spec:** `docs/v0.1/04-modules.md`

### Phase 5: M5 — Greenfield FORGE
**Package:** `@coda/coda` → `packages/coda/src/forge/`
**Depends on:** M1, M3
**Deliverable:** `/coda forge` produces ref docs + scaffolds .coda/
**Spec:** `docs/v0.1/05-forge-greenfield.md`

### Phase 6: M6 — Workflow Engine
**Package:** `@coda/coda` → `packages/coda/src/workflow/`
**Depends on:** M1–M4
**Deliverable:** Phase runner, build loop, context injection
**Spec:** `docs/v0.1/06-workflow-engine.md`

### Phase 7: M7 — Pi Integration
**Package:** `@coda/coda` → `packages/coda/src/pi/`
**Depends on:** M1–M6
**Deliverable:** Extension works in Pi, commands registered, hooks fire
**Spec:** `docs/v0.1/07-pi-integration.md`

### Phase 8: E2E Test
**Depends on:** M1–M7
**Deliverable:** Full issue lifecycle on test project

---
*Roadmap updated: 2026-03-28 after Phase 6*
