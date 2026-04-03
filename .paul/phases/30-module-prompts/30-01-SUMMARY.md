---
phase: 30-module-prompts
plan: 01
completed: 2026-04-03T01:00:00Z
duration: ~20 minutes
---

## Objective

Add the 3 remaining modules (architecture, quality, knowledge) to the CODA module system — 7 prompt files and 3 registry definitions, completing the v0.3.1 module expansion.

## What Was Built

| File | Purpose | Change |
|------|---------|--------|
| `packages/core/src/modules/registry.ts` | Module definitions | Added architecture, quality, knowledge to MODULE_DEFINITIONS + DEFAULT_THRESHOLDS |
| `modules/prompts/architecture/pre-plan.md` | NEW — architecture pre-plan prompt | Layer boundaries, file placement, circular deps, god files |
| `modules/prompts/architecture/post-build.md` | NEW — architecture post-build prompt | Import direction, file growth, responsibility creep |
| `modules/prompts/quality/pre-build.md` | NEW — quality pre-build prompt | Baseline capture: tests, lint, typecheck |
| `modules/prompts/quality/post-build.md` | NEW — quality post-build prompt | Regression check against baseline |
| `modules/prompts/quality/post-unify.md` | NEW — quality post-unify prompt | Quality delta, trend recording |
| `modules/prompts/knowledge/post-build.md` | NEW — knowledge post-build prompt | Decision capture, trade-offs, conventions |
| `modules/prompts/knowledge/post-unify.md` | NEW — knowledge post-unify prompt | Pattern extraction, lessons learned |
| `packages/core/src/modules/__tests__/registry.test.ts` | Registry tests | Updated for 5-module system (counts, hooks, thresholds) |
| `packages/coda/src/workflow/__tests__/module-integration.test.ts` | Integration tests | Updated hook expectations for new modules |
| `packages/coda/src/workflow/__tests__/module-system-e2e.test.ts` | E2E tests | Updated module participation expectations |

## Acceptance Criteria Results

| AC | Description | Status |
|----|-------------|--------|
| AC-1 | Architecture module registered with correct hooks | ✅ PASS |
| AC-2 | Quality module registered with correct hooks | ✅ PASS |
| AC-3 | Knowledge module registered with correct hooks | ✅ PASS |
| AC-4 | Default thresholds set correctly | ✅ PASS |
| AC-5 | All 7 prompt files follow convention | ✅ PASS |
| AC-6 | Structural tests pass for all 12 prompt files | ✅ PASS |
| AC-7 | No regressions | ✅ PASS |

## Verification Results

```
bun test (core) → 179 pass, 0 fail (+35 from data-driven prompt tests)
bun test (coda) → 254 pass, 0 fail
tsc --noEmit → clean (both packages)
Total: 433 tests
Prompt files: 12 across 5 modules
```

## Module Execution Reports

### Pre-Apply
- **TODD(50):** Test files exist ✓
- **WALT(100):** Baseline 398 total, 0 fail

### Post-Apply Advisory
- **IRIS(250):** 0 anti-patterns
- **DOCS(250):** No drift
- **RUBY(300):** skip
- **SKIP(300):** No new decisions

### Post-Apply Enforcement
- **WALT(100):** PASS — 433/433, +35 new, tsc clean, ↑ improving
- **TODD(200):** PASS — 433/433, 0 fail
- **ARCH(125):** PASS — no boundary violations

### Post-Unify
- **WALT(100):** Quality history updated (433/433, ↑ improving)
- **SKIP(200):** No new formal decisions
- **RUBY(300):** skip

## Deviations

- **Extra test files modified:** Plan listed 8 files_modified (registry + 7 prompts). Actual was 11 — added updates to `registry.test.ts`, `module-integration.test.ts`, `module-system-e2e.test.ts` for 5-module expectations. Required because existing tests had hardcoded 2-module assumptions.
- **Task 1 subagent couldn't fix test files:** pals-implementer reported PASS_WITH_CONCERNS because registry tests were outside its allowed scope. Parent fixed all stale test assertions inline before running Task 2.

## Key Patterns

- **Data-driven test framework pays off:** The `prompts.test.ts` auto-generated 35 structural tests from MODULE_DEFINITIONS with zero test code changes — exactly as designed in v0.3.
- **No infrastructure changes needed:** All 3 modules added purely via registry entries + markdown files. The v0.3 architecture (registry → dispatcher → prompt resolution) scaled cleanly from 2 to 5 modules.

## Next Phase

Phase 31: E2E Validation — archive old test project, fresh CMUX stress test with all 5 modules active.
