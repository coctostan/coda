# Roadmap: coda-ecosystem

## Overview
A suite of Pi extensions for disciplined, agent-assisted software development.

## Current Milestone
**v0.4 Live Validation** (v0.4.0)
Status: 🚧 In Progress
Phases: 2 of 3 complete

| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 26 | Operational Fixes | 1/1 | ✅ Complete | 2026-03-29 |
| 27 | Deep Code Review + Fixes | 1/1 | ✅ Complete | 2026-03-29 |
| 28 | CMUX Stress Test | TBD | Not started | - |

### Phase 26: Operational Fixes
Focus: Fix 10 known issues (LIVE-01 through LIVE-10) blocking live Pi/CMUX sessions
Plans: TBD (defined during /paul:plan)

### Phase 27: Deep Code Review + Fixes
Focus: Production-readiness review of packages/coda/src/ — catch issues the sweep missed, fix them
Plans: TBD (defined during /paul:plan)

### Phase 28: CMUX Stress Test
Focus: Scripted live Pi session building a real Pi extension through full CODA lifecycle (user-supplied test script)
Model: openai-codex/gpt-5.4-mini, thinking high
Test project: ~/pi/workspace/coda-test1 (coctostan/coda-test1)
Plans: TBD (defined during /paul:plan)

## Completed Milestones

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
- Milestone history: `.paul/MILESTONES.md`

---
*Roadmap updated: 2026-03-29 — v0.4 Live Validation milestone created*
