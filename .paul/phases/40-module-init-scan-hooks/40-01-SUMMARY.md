---
phase: 40-module-init-scan-hooks
plan: 01
completed: 2026-04-03T05:30:00Z
duration: ~15 minutes
---

## Objective
Extend the module system with init-scan hooks, update backdrop detection for brownfield, and create evidence file management.

## What Was Built

| File | Purpose | Lines |
|------|---------|-------|
| packages/core/src/modules/registry.ts | Added init-scan hooks to all 5 module definitions | +5 hooks |
| packages/coda/src/forge/types.ts | Added `brownfield` variant to ForgeBackdrop | +1 line |
| packages/coda/src/forge/scaffold.ts | detectBackdrop now returns brownfield for code projects | +17 lines |
| packages/coda/src/forge/evidence.ts | NEW: writeEvidence, readEvidence, readAllEvidence | 117 lines |
| packages/coda/src/forge/index.ts | Re-exported evidence types + functions | +3 lines |
| modules/prompts/security/init-scan.md | NEW: Security brownfield scan prompt | — |
| modules/prompts/tdd/init-scan.md | NEW: TDD brownfield scan prompt | — |
| modules/prompts/architecture/init-scan.md | NEW: Architecture brownfield scan prompt | — |
| modules/prompts/quality/init-scan.md | NEW: Quality brownfield scan prompt | — |
| modules/prompts/knowledge/init-scan.md | NEW: Knowledge brownfield scan prompt | — |

## Acceptance Criteria Results

| AC | Description | Status |
|----|-------------|--------|
| AC-1 | All 5 modules have init-scan hooks | ✅ PASS |
| AC-2 | Brownfield detection | ✅ PASS |
| AC-3 | Greenfield detection unchanged | ✅ PASS |
| AC-4 | Evidence file write | ✅ PASS |
| AC-5 | Evidence file read | ✅ PASS |

## Verification Results

- `tsc --noEmit` — clean ✅
- All 3 target test files pass ✅
- `bun test` (full suite) — 534 pass, 0 fail ✅

## Module Execution Reports

**Post-apply enforcement:** WALT(p100) PASS 534/0, TODD(p200) PASS
**Post-unify:** WALT(p100) quality delta (498→534 ↑), SKIP(p200) 0 decisions, RUBY(p300) no debt

## Deviations
- Created 5 init-scan prompt files (not in original plan scope) — required by existing structural prompt tests that verify every hook in MODULE_DEFINITIONS has a readable prompt file
- Fixed 2 existing tests that used `init-scan` as "no modules" example → changed to `pre-specify`

## Next Phase
Phase 41: Brownfield SCAN — module-driven evidence gathering during brownfield FORGE.
