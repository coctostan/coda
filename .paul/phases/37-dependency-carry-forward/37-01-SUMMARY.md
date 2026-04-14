---
phase: 37-dependency-carry-forward
plan: 01
completed: 2026-04-03T04:50:00Z
duration: ~10 minutes
---

## Objective
Add dependency-aware carry-forward to the context builder — tasks get context from declared dependencies instead of blind recency, with correction-task and recency fallback paths.

## What Was Built

| File | Purpose | Lines |
|------|---------|-------|
| packages/coda/src/workflow/context-builder.ts | Added `getCarryForwardSummaries()` with 3 selection paths | 433 (+58) |
| packages/coda/src/workflow/__tests__/context-builder.test.ts | 6 new tests for carry-forward | +170 |
| packages/coda/src/workflow/index.ts | Re-exported new function | +1 |

## Acceptance Criteria Results

| AC | Description | Status |
|----|-------------|--------|
| AC-1 | Dependency-based carry-forward | ✅ PASS |
| AC-2 | Recency fallback | ✅ PASS |
| AC-3 | Correction task context | ✅ PASS |
| AC-4 | Missing dependency graceful skip | ✅ PASS |
| AC-5 | No completed tasks | ✅ PASS |

## Verification Results

- `tsc --noEmit` — clean ✅
- `bun test context-builder.test.ts` — 25 pass, 0 fail (19 existing + 6 new) ✅
- `bun test` (full suite) — 478 pass, 0 fail ✅
- Export verified in `index.ts` ✅

## Module Execution Reports

**Pre-plan:** ARCH(p75) clean, TODD(p100) tdd_candidates, IRIS(p150) clean
**Pre-apply:** TODD(p50) baseline, WALT(p100) baseline 472/0
**Post-apply advisory:** IRIS(p250) 0 issues, DOCS(p250) no drift, RUBY(p300) no debt
**Post-apply enforcement:** WALT(p100) PASS 478/0, TODD(p200) PASS
**Post-unify:** WALT(p100) quality delta (472→478 ↑), SKIP(p200) 0 decisions, RUBY(p300) no debt

## Deviations
None. Plan executed exactly as specified.

## Key Patterns
- `getCarryForwardSummaries` reuses existing `getSourceTaskSummaries` and `loadVerificationFailure` — no code duplication
- Existing `getPreviousTaskSummaries` left untouched for backward compatibility
- Wiring into `build-loop.ts` and `phase-runner.ts` deferred to Phase 39 (context budgets)

## Next Phase
Phase 38: Adaptive Ceremony Rules — issue types get different phase depths.
