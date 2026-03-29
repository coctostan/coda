# Roadmap: coda-ecosystem

## Overview
A suite of Pi extensions for disciplined, agent-assisted software development.

## Current Milestone
**v0.2 Autonomous Loops** (v0.2.0)
Status: 🚧 In Progress
Phases: 4 of 7 complete

## Phases

| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 9 | State Submodes + Loop Tracking | 1/1 | ✅ Complete | 2026-03-29 |
| 10 | Review Runner | 1/1 | ✅ Complete | 2026-03-29 |
| 11 | Verify Runner + Correction Tasks | 1/1 | ✅ Complete | 2026-03-29 |
| 12 | Human Review Gate | 1/1 | ✅ Complete | 2026-03-29 |
| 13 | Exhaustion Handling + Rewind/Kill Controls | TBD | Ready to plan | - |
| 14 | Pi Integration Updates | TBD | Not started | - |
| 15 | E2E Validation | TBD | Not started | - |

## Phase Details

### Phase 9: State Submodes + Loop Tracking
Focus: Add `submode`, `loop_iteration`, transition rules, exhaustion checks, config fields, and persistence/tests in `@coda/core`.
Plans: `09-01-PLAN.md`, `09-01-SUMMARY.md`

### Phase 10: Review Runner
Focus: Add `review-runner.ts`, structural checks, revision-instructions artifact, and the `review ↔ revise` autonomous loop.
Plans: `10-01-PLAN.md`, `10-01-SUMMARY.md`

### Phase 11: Verify Runner + Correction Tasks
Focus: Add `verify-runner.ts`, per-AC verification, failure artifacts, correction task generation, and BUILD-loop integration for correction tasks.
Plans: `11-01-PLAN.md`, `11-01-SUMMARY.md`

### Phase 12: Human Review Gate
Focus: Add `human_review_status`, review→build gate updates, conversational human change requests, and durable review state.
Plans: `12-01-PLAN.md`, `12-01-SUMMARY.md`

### Phase 13: Exhaustion Handling + Rewind/Kill Controls
Focus: Add exhaustion pause flows, `/coda kill`, `/coda back <phase>`, and preservation/supersede semantics for rewind.
Plans: TBD (defined during /paul:plan)

### Phase 14: Pi Integration Updates
Focus: Update `before_agent_start`, command handling, and submode-aware context injection for review/revise/verify/correct.
Plans: TBD (defined during /paul:plan)

### Phase 15: E2E Validation
Focus: Validate all four required v0.2 scenarios end-to-end with the v0.1 clean prerequisite satisfied.
Plans: TBD (defined during /paul:plan)

## Completed Milestones

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
- Active milestone context comes from `docs/v0.2/00-overview.md` through `docs/v0.2/04-human-review.md`
- Previous milestone archive: `.paul/milestones/v0.1.0-ROADMAP.md`
- Milestone history: `.paul/MILESTONES.md`

---
*Roadmap updated: 2026-03-29 after Phase 12 completion*
