# Roadmap: coda-ecosystem

## Overview
A suite of Pi extensions for disciplined, agent-assisted software development.

## Current Milestone
**v0.10 Close the Agent Loop** (v0.10.0)
Status: 🚧 In Progress
Started: 2026-04-16
Theme: "The compounding engine actually compounds."

| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 53 | Agent Entry Points | 1/1 | ✅ Complete | 2026-04-16 |
| 54 | UNIFY Actually Produces Artifacts | 0/TBD | ⚪ Not started | — |
| 55 | Supporting Systems Repair | 0/TBD | ⚪ Not started | — |
| 56 | Lifecycle-First Prompts | 0/TBD | ⚪ Not started | — |
| 57 | E2E Re-Validation | 0/TBD | ⚪ Not started | — |

### Phase 53: Agent Entry Points — ✅ Complete 2026-04-16
Focus: Make FORGE and focus-issue agent-callable — `coda_forge` and `coda_focus` tools; F7 write-gate regression guard
Addresses: F1 (forge not agent-callable), F2 (no focus tool), F7 (write-gate regression)
Spec: `.paul/milestones/v0.10.0-ROADMAP.md`
Plans: 1 — `.paul/phases/53-agent-entry-points/53-01-PLAN.md` → `53-01-SUMMARY.md`
Outcome: 2 new agent-callable tools (`coda_forge`, `coda_focus`), shared `focusIssue()` helper, slash-command refactor (byte-identical notify strings), bare-workspace E2E, Pi mutation tool surface audit, F7 integration guard, `DEBUG=coda:*` diagnostic. Tests 655→673 (+18, 0 fail). Merged as squash `65a9df7` on main via PR #21.

### Phase 54: UNIFY Actually Produces Artifacts
Focus: Make UNIFY generate overlays and reference doc updates, not just completion records — the headline fix
Addresses: F5 (UNIFY produces zero artifacts)
Spec: `.paul/milestones/v0.10.0-ROADMAP.md`
Depends: Phase 53 (need focus tool to run UNIFY in a test)
Plans: TBD (defined during /paul:plan)

### Phase 55: Supporting Systems Repair
Focus: Fix `coda_run_tests`, strengthen write gate, remove legacy `human_review_default` field
Addresses: F6, F7 (completion of Phase 53's write gate work), deferred item #1
Spec: `.paul/milestones/v0.10.0-ROADMAP.md`
Depends: Can run parallel to Phase 54
Plans: TBD (defined during /paul:plan)

### Phase 56: Lifecycle-First Prompts
Focus: Strengthen CODA-injected prompts so agent creates an issue before building; add tool manifest and lifecycle overview to session-start
Addresses: F3 (agent builds first), F4 (agent reads source to understand tools)
Spec: `.paul/milestones/v0.10.0-ROADMAP.md`
Depends: Phase 53 (prompts reference new tools)
Plans: TBD (defined during /paul:plan)

### Phase 57: E2E Re-Validation
Focus: Re-run Script A with v0.10 code; prove compounding engine actually compounds
Spec: `.paul/milestones/v0.10.0-ROADMAP.md`, `explorations/cmux-v08-test-scripts.md` (Script A)
Depends: Phases 53–56
Plans: TBD (defined during /paul:plan)

## Completed Milestones
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
- v0.10 vision: `.paul/milestones/v0.10.0-ROADMAP.md`
- Milestone history: `.paul/MILESTONES.md`

---
*Roadmap updated: 2026-04-16 — Phase 53 shipped; v0.10 at 1 of 5 phases complete*
