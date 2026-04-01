---
phase: 21-module-prompts
plan: 01
completed: 2026-04-01T19:20:00Z
duration: ~10 minutes
---

## Objective
Create 5 module prompt files for security and tdd modules plus a structural test suite, connecting the v0.3 module infrastructure to actual domain expertise content.

## What Was Built

| File | Purpose | Lines |
|------|---------|-------|
| `modules/prompts/security/pre-plan.md` | Pre-plan security assessment prompt — auth, injection, secrets, sensitive scope | 31 |
| `modules/prompts/security/post-build.md` | Post-build security review prompt — hardcoded secrets, injection risks, auth middleware, validation, logs | 33 |
| `modules/prompts/tdd/pre-build.md` | Pre-build TDD enforcement prompt — RED-GREEN-REFACTOR cycle, write-gate, anti-patterns | 40 |
| `modules/prompts/tdd/post-task.md` | Post-task TDD compliance check — test ordering, scenario coverage, behavior vs impl, tautological tests | 34 |
| `modules/prompts/tdd/post-build.md` | Post-build TDD summary — full suite health, AC coverage, refactor candidates | 35 |
| `packages/core/src/modules/__tests__/prompts.test.ts` | 25 structural tests validating prompt convention (5 checks × 5 files) | 85 |

## Acceptance Criteria Results

| AC | Description | Status |
|----|-------------|--------|
| AC-1 | Security pre-plan prompt follows convention | ✓ PASS |
| AC-2 | Security post-build prompt follows convention | ✓ PASS |
| AC-3 | TDD pre-build prompt follows convention | ✓ PASS |
| AC-4 | TDD post-task prompt follows convention | ✓ PASS |
| AC-5 | TDD post-build prompt follows convention | ✓ PASS |
| AC-6 | Test suite validates all 5 prompts structurally | ✓ PASS (25 tests) |
| AC-7 | No regressions | ✓ PASS (140 total, 115 existing + 25 new) |

## Verification Results

- `ls modules/prompts/security/` → pre-plan.md, post-build.md ✓
- `ls modules/prompts/tdd/` → pre-build.md, post-task.md, post-build.md ✓
- All 5 prompts contain "What to Check" and "Severity Guide" sections ✓
- No prompt file contains JSON output formatting (dispatcher appends FINDINGS_OUTPUT_TEMPLATE) ✓
- `cd packages/core && bun test src/modules/__tests__/prompts.test.ts` → 25 pass, 0 fail ✓
- `cd packages/core && bun test` → 140 pass, 0 fail ✓
- `cd packages/core && bunx tsc --noEmit` → clean ✓
- `cd packages/coda && bun test` → 175 pass, 0 fail (no cross-package regressions) ✓

## Module Execution Reports

⚠️ Post-unify hooks did not fire. Reason: no modules registered for post-unify in the CODA module system (v0.3 modules are security + tdd only; quality/knowledge post-unify hooks are v0.3.1). PALS modules (WALT, SKIP, RUBY) fired during post-apply enforcement — quality baseline tracked there.

Post-apply enforcement results:
- WALT(100): PASS — 140 tests (115 baseline + 25 new), 0 regressions, tsc clean
- TODD(200): PASS — 315 total tests across core + coda, 0 fail

## Deviations

None.

## Key Patterns/Decisions

- **Prompt convention is mechanical:** All prompts follow the exact same structure (Header → Context → What to Check → Severity Guide → Assumption Guidance). This makes adding new module prompts in v0.3.1 straightforward.
- **Tests are derived from MODULE_DEFINITIONS:** The test suite iterates `MODULE_DEFINITIONS` entries rather than hardcoding file paths. When v0.3.1 adds architecture/quality/knowledge, the tests will automatically cover new prompts once their hooks are registered.
- **Old v0.1 prompts preserved:** `modules/prompts/todd.md` and `modules/prompts/walt.md` remain untouched. They'll be deleted in Phase 22 (workflow integration, Decision D4).

## Next Phase

Phase 22: Workflow Integration — Wire dispatcher into phase boundaries, moduleBlockFindings in GateCheckData, delete old todd/walt system.
