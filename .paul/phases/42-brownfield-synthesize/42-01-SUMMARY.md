---
phase: 42-brownfield-synthesize
plan: 01
completed: 2026-04-03T06:00:00Z
duration: ~10 minutes
---

## Objective
Add SYNTHESIZE orchestration — reads evidence from SCAN and provides ref doc specs for agent-driven reference doc generation.

## What Was Built

| File | Purpose | Lines |
|------|---------|-------|
| packages/coda/src/forge/brownfield.ts | Added RefDocSpec, SYNTHESIZE_REF_DOCS (4 docs), SynthesizeContext, assembleSynthesizeContext | 209 (+84) |
| packages/coda/src/forge/__tests__/brownfield.test.ts | 5 new SYNTHESIZE tests | +68 |
| packages/coda/src/forge/index.ts | Re-exported new types + functions | +3 |

## Acceptance Criteria Results

| AC | Description | Status |
|----|-------------|--------|
| AC-1 | Evidence loaded for synthesis | ✅ PASS |
| AC-2 | Ref doc specs included | ✅ PASS |
| AC-3 | Empty evidence handled | ✅ PASS |
| AC-4 | SYNTHESIZE_REF_DOCS has all 4 entries | ✅ PASS |

## Verification Results

- `tsc --noEmit` — clean ✅
- `bun test brownfield.test.ts` — 17 pass (12 SCAN + 5 SYNTHESIZE) ✅
- `bun test` (full suite) — 551 pass, 0 fail ✅

## Module Execution Reports

**Post-apply enforcement:** WALT(p100) PASS 551/0, TODD(p200) PASS
**Post-unify:** WALT(p100) quality delta (546→551 ↑), SKIP(p200) 0 decisions, RUBY(p300) no debt

## Deviations
None.

## Next Phase
Phase 43: Brownfield GAP ANALYSIS — module-driven gap assessment with dependency-aware ordering.
