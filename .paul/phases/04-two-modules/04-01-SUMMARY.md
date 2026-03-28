---
phase: 04-two-modules
plan: 01
completed: 2026-03-28T12:00:00Z
duration: ~15 minutes
---

## Objective

Create the first two CODA modules — Todd (TDD enforcement) and Walt (quality baseline) — as markdown prompt data files with TypeScript loaders and hook-point routing. Pure prompt injection, no registry or dispatcher.

## What Was Built

| File | Purpose | Lines |
|------|---------|-------|
| `modules/prompts/todd.md` | TDD enforcement prompt (RED-GREEN cycle, write-gate, anti-patterns) | 23 |
| `modules/prompts/walt.md` | Post-task quality check prompt (regression rules, baseline comparison) | 18 |
| `packages/coda/src/modules/todd.ts` | TypeScript loader for Todd prompt with hook-point config | 21 |
| `packages/coda/src/modules/walt.ts` | TypeScript loader for Walt prompt with hook-point config | 21 |
| `packages/coda/src/modules/index.ts` | Barrel export + `getModulePrompts()` hook routing | 36 |
| `packages/coda/src/modules/__tests__/modules.test.ts` | 11 tests covering prompt content + hook routing | 79 |
| `packages/coda/src/index.ts` | Updated barrel — added modules re-export | +3 |

## Acceptance Criteria Results

| AC | Description | Status |
|----|-------------|--------|
| AC-1 | Todd prompt exists as markdown data with TDD content | ✓ PASS |
| AC-2 | Walt prompt exists as markdown data with quality check content | ✓ PASS |
| AC-3 | TypeScript loaders export prompts loaded from .md files | ✓ PASS |
| AC-4 | Hook-point routing returns correct prompts per hook | ✓ PASS |

## Verification Results

```
$ bun test (full suite)
129 pass, 0 fail, 326 expect() calls
Ran 129 tests across 15 files. [78.00ms]

$ npx tsc --noEmit
✓ Build successful (0 units compiled)
```

Test delta: +11 new tests (118 → 129), 0 regressions.

## Module Execution Reports

**Pre-apply dispatch:**
- TODD(50): Test infrastructure present, 14 files baseline
- WALT(100): Baseline recorded — 118 pass, 0 fail

**Post-task dispatch:**
- Task 1: TODD(100) → PASS (118/118, data files only)
- Task 2: TODD(100) → PASS (129/129, +11 new, no regression)

**Post-apply advisory:**
- IRIS(250): 0 annotations — no code smells
- DOCS(250): 0 drift — internal source files, no public docs affected
- RUBY(300): 0 debt — all files under 80 lines
- SKIP(300): 0 new decisions — existing decisions already captured

**Post-apply enforcement:**
- WALT(100): PASS — 129/0, tsc clean
- DEAN(150): PASS — 0 external dependencies
- TODD(200): PASS — all green, no refactor candidates

**Post-unify:**
- WALT(100): Quality history created — 118 → 129 tests, trend ↑ improving
- SKIP(200): 1 decision record captured (prompts as .md data)
- RUBY(300): 0 debt — all files under 300 lines, no complex functions

## Deviations

None. All tasks executed exactly as planned.

## Key Patterns/Decisions

- Prompts loaded via `readFileSync` at module load time — simple, synchronous, zero external deps
- Path resolution uses `import.meta.dir` (Bun-native) with 4-level walkup to repo root
- Hook points are `readonly string[]` arrays for type safety
- `getModulePrompts()` is a simple linear scan — no priority ordering needed for 2 modules

## Next Phase

Phase 5: M5 — Greenfield FORGE (`packages/coda/src/forge/`)
