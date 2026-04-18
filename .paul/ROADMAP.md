# Roadmap: coda-ecosystem

## Overview
A suite of Pi extensions for disciplined, agent-assisted software development.

## Current Milestone
**v0.11 Six Fixes and Re-Validation** (v0.11.0)
Status: 🚧 In Progress
Started: 2026-04-17
Theme: "Fix the live lifecycle gaps, then prove compounding works."
| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 58 | Lifecycle Bug Fixes | 1/1 | ✅ Complete | 2026-04-18 |
| 59 | Lifecycle Integrity | TBD | Not started | - |
| 60 | E2E Re-Validation | TBD | Not started | - |

### Phase 58: Lifecycle Bug Fixes
Focus: Fix the concrete code-path bugs surfaced by Phase 57 — nil-unsafe SPECIFY → PLAN advance, duplicate section replacement behavior, and missing/unclear test-command defaults during scaffold.
Addresses: C1, C2, C3
Spec: `.paul/milestones/v0.11.0-ROADMAP.md`
Plans: 1 — `.paul/phases/58-lifecycle-bug-fixes/58-01-PLAN.md`
Outcome target: `coda_advance` fails cleanly instead of crashing, `coda_edit_body` does not create duplicate headings on replace, and scaffold seeds detectable test defaults or an explicit follow-up when detection is not possible.

### Phase 59: Lifecycle Integrity
Focus: Make the live lifecycle trustworthy once Phase 58 unblocks it — VERIFY must require explicit evidence, and UNIFY must actually execute its artifact-producing actions in the reachable lifecycle path.
Addresses: C4, C5
Spec: `.paul/milestones/v0.11.0-ROADMAP.md`
Depends: Phase 58
Plans: TBD (defined during /paul:plan)
Outcome target: VERIFY rejects no-evidence success claims, existing UNIFY evidence gates are exercised in a real reachable path, and programmatic lifecycle coverage proves SPECIFY → PLAN → BUILD → VERIFY → UNIFY → DONE can complete honestly.

### Phase 60: E2E Re-Validation
Focus: Re-run Script A against the shipped v0.11 code and prove whether compounding now works in practice.
Addresses: C6 and milestone validation
Spec: `.paul/milestones/v0.11.0-ROADMAP.md`, `/Users/maxwellnewman/pi/workspace/thinkingSpace/plans/v0.11-six-fixes-and-revalidation.md`
Depends: Phases 58–59
Plans: TBD (defined during /paul:plan)
Outcome target: Phase 57's failure modes are either gone with evidence or precisely re-documented without moving the goalposts.
## Completed Milestones
<details>
<summary>v0.10 Close the Agent Loop — 2026-04-17 (5 phases, 5 plans, documented failure)</summary>

| Phase | Name | Plans | Completed |
|-------|------|-------|-----------|
| 53 | Agent Entry Points | 1/1 | 2026-04-16 |
| 54 | UNIFY Actually Produces Artifacts | 1/1 | 2026-04-16 |
| 55 | Supporting Systems Repair | 1/1 | 2026-04-16 |
| 56 | Lifecycle-First Prompts | 1/1 | 2026-04-17 |
| 57 | E2E Re-Validation | 1/1 | 2026-04-17 |

Outcome: v0.10 closed as a documented failure. Entry improved (`coda_forge`, `coda_focus`, configured `coda_run_tests`), but live SPECIFY → PLAN advancement, VERIFY truthfulness, and UNIFY artifact/completion behavior remained broken in Script A. See `docs/v0.10/E2E-COMPOUNDING-FINDINGS-v2.md` and `.paul/phases/57-e2e-re-validation/57-01-SUMMARY.md`.

</details>
<details>
<summary>v0.9 Live Compounding Validation — 2026-04-16 (1 phase shipped, 1 deferred)</summary>

| Phase | Name | Plans | Completed |
|-------|------|-------|-----------|
| 52 | Greenfield Compounding Test | 1/1 | 2026-04-16 |
| 53 | Brownfield Onboarding Test | — | Deferred to v0.11+ |

Outcome: 8-finding E2E report (3 critical, 4 high, 1 medium) proving compounding engine does not compound in practice. Drives v0.10 scope.

</details>
<details>
<summary>v0.8 The Compounding Engine — 2026-04-15 (5 phases, 5 plans)</summary>

| Phase | Name | Plans | Completed |
|-------|------|-------|-----------|
| 47 | UNIFY Runner Core | 1/1 | 2026-04-14 |
| 48 | UNIFY Review Gate | 1/1 | 2026-04-14 |
| 49 | Module Overlay Infrastructure | 1/1 | 2026-04-14 |
| 50 | Gate Automation | 1/1 | 2026-04-15 |
| 51 | E2E Validation | 1/1 | 2026-04-15 |

New: UNIFY runner (5-action prompt, completion records), UNIFY review gate (human approval), module overlays (two-layer prompts), gate automation (human/auto/auto-unless-block), cross-feature E2E validation

</details>
<details>
<summary>v0.7 Brownfield & Context — 2026-04-03 (11 phases, 11 plans)</summary>

| Phase | Name | Plans | Completed |
|-------|------|-------|-----------|
| 36 | Topic-based Section Retrieval | 1/1 | 2026-04-03 |
| 37 | Dependency-based Carry-forward | 1/1 | 2026-04-03 |
| 38 | Adaptive Ceremony Rules | 1/1 | 2026-04-03 |
| 39 | Context Budget Management | 1/1 | 2026-04-03 |
| 40 | Module Init-scan Hooks | 1/1 | 2026-04-03 |
| 41 | Brownfield SCAN | 1/1 | 2026-04-03 |
| 42 | Brownfield SYNTHESIZE | 1/1 | 2026-04-03 |
| 43 | Brownfield GAP ANALYSIS | 1/1 | 2026-04-03 |
| 44 | Brownfield VALIDATE + ORIENT | 1/1 | 2026-04-03 |
| 45 | Wire Brownfield into /coda forge | 1/1 | 2026-04-03 |
| 46 | E2E Brownfield on coda-test-todo | 1/1 | 2026-04-03 |

New: Topic retrieval, carry-forward, ceremony, budgets, brownfield FORGE (SCAN→SYNTHESIZE→GAP→VALIDATE→ORIENT), /coda forge brownfield routing

</details>
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
- v0.7 archive: `.paul/milestones/v0.7.0-ROADMAP.md`
- v0.8 archive: `.paul/milestones/v0.8.0-ROADMAP.md`
- v0.9 archive: `.paul/milestones/v0.9.0-ROADMAP.md`
- v0.10 archive: `.paul/milestones/v0.10.0-ROADMAP.md`
- v0.11 vision: `.paul/milestones/v0.11.0-ROADMAP.md`
- Milestone history: `.paul/MILESTONES.md`

---
*Roadmap updated: 2026-04-17 — v0.11 created as the new current milestone after v0.10 closed as a documented failure*
