# Roadmap: coda-ecosystem

## Overview
A suite of Pi extensions for disciplined, agent-assisted software development.

## Current Milestone
**v0.7 Brownfield & Context** (v0.7.0)
Status: 🚧 In Progress
Phases: 3 of 11 complete
Spec: docs/v0.4/00-overview.md

| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 36 | Topic-based Section Retrieval | 1/1 | ✅ Complete | 2026-04-03 |
| 37 | Dependency-based Carry-forward | 1/1 | ✅ Complete | 2026-04-03 |
| 38 | Adaptive Ceremony Rules | 1/1 | ✅ Complete | 2026-04-03 |
| 39 | Context Budget Management | TBD | Not started | - |
| 40 | Module Init-scan Hooks | TBD | Not started | - |
| 41 | Brownfield SCAN | TBD | Not started | - |
| 42 | Brownfield SYNTHESIZE | TBD | Not started | - |
| 43 | Brownfield GAP ANALYSIS | TBD | Not started | - |
| 44 | Brownfield VALIDATE + ORIENT | TBD | Not started | - |
| 45 | Wire Brownfield into /coda forge | TBD | Not started | - |
| 46 | E2E Brownfield on coda-test-todo | TBD | Not started | - |

### Phase 36: Topic-based Section Retrieval
Focus: Topic-based section retrieval in data layer — inject only matching sections from large ref docs
Spec: docs/v0.4/01-topic-retrieval.md
Plans: TBD (defined during /paul:plan)

### Phase 37: Dependency-based Carry-forward
Focus: Dependency-based carry-forward in context builder — BUILD tasks get context from dependency tasks
Spec: docs/v0.4/02-carry-forward.md
Plans: TBD (defined during /paul:plan)

### Phase 38: Adaptive Ceremony Rules
Focus: Adaptive ceremony rules per issue type — features vs bugfixes vs chores get different phase depths
Spec: docs/v0.4/03-ceremony.md
Plans: TBD (defined during /paul:plan)

### Phase 39: Context Budget Management
Focus: Per-phase context limits, module finding summarization, advisory budgets
Spec: docs/v0.4/04-context-budgets.md
Depends: Phases 36, 37
Plans: TBD (defined during /paul:plan)

### Phase 40: Module Init-scan Hooks
Focus: Module init-scan hook point + dispatch — extends module system for brownfield scanning
Spec: docs/v0.4/05-brownfield-forge.md
Depends: v0.3 module system
Plans: TBD (defined during /paul:plan)

### Phase 41: Brownfield SCAN
Focus: Module-driven evidence gathering during brownfield FORGE
Spec: docs/v0.4/05-brownfield-forge.md
Depends: Phase 40
Plans: TBD (defined during /paul:plan)

### Phase 42: Brownfield SYNTHESIZE
Focus: Build reference docs from evidence gathered during SCAN
Spec: docs/v0.4/05-brownfield-forge.md
Depends: Phase 41
Plans: TBD (defined during /paul:plan)

### Phase 43: Brownfield GAP ANALYSIS
Focus: Module-driven gap assessment with dependency-aware ordering
Spec: docs/v0.4/05-brownfield-forge.md
Depends: Phase 42
Plans: TBD (defined during /paul:plan)

### Phase 44: Brownfield VALIDATE + ORIENT
Focus: Human review gate + future direction for brownfield onboarding
Spec: docs/v0.4/05-brownfield-forge.md
Depends: Phase 43
Plans: TBD (defined during /paul:plan)

### Phase 45: Wire Brownfield into /coda forge
Focus: Detect backdrop, route to greenfield or brownfield in forge command
Spec: docs/v0.4/05-brownfield-forge.md
Depends: Phases 41–44
Plans: TBD (defined during /paul:plan)

### Phase 46: E2E Brownfield on coda-test-todo
Focus: Full brownfield forge run on coda-test-todo project — validates entire flow
Spec: docs/v0.4/E2E-TEST-SCRIPT-v0.4.md
Depends: All previous phases
Plans: TBD (defined during /paul:plan)
## Completed Milestones
<details>
<summary>v0.6 VCS & Workflow Gaps — 2026-04-03 (4 phases, 4 plans)</summary>

| Phase | Name | Plans | Completed |
|-------|------|-------|-----------|
| 32 | Module Cleanup | 1/1 | 2026-04-03 |
| 33 | VCS Integration + /coda activate | 1/1 | 2026-04-03 |
| 34 | coda_query + Findings Summarization | 1/1 | 2026-04-03 |
| 35 | E2E Validation | 1/1 | 2026-04-03 |

New: VCS integration (branch/commit), /coda activate, coda_query (10th tool), module cleanup

</details>
<details>
<summary>v0.5 Module Completion — 2026-04-03 (3 phases, 3 plans)</summary>

| Phase | Name | Plans | Completed |
|-------|------|-------|-----------|
| 29 | E2E Fixes | 1/1 | 2026-04-03 |
| 30 | Module Prompts — Architecture + Quality + Knowledge | 1/1 | 2026-04-03 |
| 31 | E2E Validation | 1/1 | 2026-04-03 |

Resolved: F4 (state.json), F2 (coda_config tool), F6 (build auto-advance), F8 (findings UX), 3 new modules

</details>
<details>
<summary>v0.4 Live Validation — 2026-04-02 (3 phases, 3 plans)</summary>

| Phase | Name | Plans | Completed |
|-------|------|-------|-----------|
| 26 | Operational Fixes | 1/1 | 2026-03-29 |
| 27 | Deep Code Review + Fixes | 1/1 | 2026-03-29 |
| 28 | CMUX Stress Test | 1/1 | 2026-03-29 |

Resolved Decisions: D6 (coda_report_findings tool), sticky findings replacement, write gate fail-closed

</details>
<details>
<summary>v0.3 Module System — 2026-03-29 (8 phases, 8 plans)</summary>

| Phase | Name | Plans | Completed |
|-------|------|-------|-----------|
| 18 | Core Types + Finding Schema | 1/1 | 2026-04-01 |
| 19 | Module Registry | 1/1 | 2026-04-01 |
| 20 | Module Dispatcher | 1/1 | 2026-04-01 |
| 21 | Module Prompts — Security + TDD | 1/1 | 2026-04-01 |
| 22 | Workflow Integration | 1/1 | 2026-04-01 |
| 23 | Config Integration | 1/1 | 2026-04-01 |
| 24 | Findings Persistence + Context Summarization | 1/1 | 2026-04-01 |
| 25 | E2E Validation | 1/1 | 2026-03-29 |

Resolved Decisions: D1 ('none' threshold), D2 (two-method API), D3 (security+tdd only), D4 (clean migration), D5 (gate authority)

</details>

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
- v0.3 archive: `.paul/milestones/v0.3.0-ROADMAP.md`
- v0.4 archive: `.paul/milestones/v0.4.0-ROADMAP.md`
- v0.5 archive: `.paul/milestones/v0.5.0-ROADMAP.md`
- v0.6 archive: `.paul/milestones/v0.6.0-ROADMAP.md`
- Milestone history: `.paul/MILESTONES.md`

---
*Roadmap updated: 2026-04-03 — v0.7 Brownfield & Context milestone created*
