---
phase: 29-e2e-fixes
plan: 01
completed: 2026-04-03T00:30:00Z
duration: ~25 minutes
---

## Objective

Fix the 4 E2E findings (F4, F2, F6, F8) from the v0.4 CMUX stress test so fresh CODA projects work end-to-end without manual workarounds.

## What Was Built

| File | Purpose | Change |
|------|---------|--------|
| `packages/coda/src/forge/scaffold.ts` | State initialization on scaffold | `scaffoldCoda()` now creates `state.json` via `createDefaultState()` + `persistState()` (F4) |
| `packages/coda/src/forge/__tests__/scaffold.test.ts` | Scaffold tests | Added state.json existence + content validation |
| `packages/coda/src/tools/coda-config.ts` | NEW — config tool | `codaConfig()` for get/set on `coda.json` with dot-path support, validation, error handling (F2) |
| `packages/coda/src/tools/__tests__/coda-config.test.ts` | NEW — config tests | 8 tests: get full, get key, get dot-path, set top-level, set dot-path, reject unknown, preserve keys, missing file |
| `packages/coda/src/tools/index.ts` | Tool exports | Added `codaConfig` export |
| `packages/coda/src/pi/tools.ts` | Pi tool registration | Registered `coda_config` tool with schema + handler (9 tools total) |
| `packages/coda/src/pi/__tests__/commands.test.ts` | Tool count fix | Updated stale assertion 8 → 9 tools |
| `packages/coda/src/pi/__tests__/hooks.test.ts` | Tool count fix | Updated stale assertion 8 → 9 tools |
| `packages/coda/src/workflow/build-loop.ts` | Auto-advance instruction | Added Task Completion Protocol block for non-correction tasks (F6) |
| `packages/coda/src/workflow/__tests__/build-loop.test.ts` | Build-loop tests | Added protocol presence/absence tests for regular vs correction tasks |
| `packages/coda/src/workflow/module-integration.ts` | Findings instruction | Improved `buildFindingsSubmissionInstruction()` with explicit JSON format, severity enum, no-issues example (F8) |
| `packages/coda/src/workflow/__tests__/module-integration.test.ts` | Module integration tests | Added findings instruction format verification |

## Acceptance Criteria Results

| AC | Description | Status |
|----|-------------|--------|
| AC-1 | scaffoldCoda creates state.json | ✅ PASS |
| AC-2 | coda_config get returns full config | ✅ PASS |
| AC-3 | coda_config set updates specific key | ✅ PASS |
| AC-4 | coda_config set supports dot-path keys | ✅ PASS |
| AC-5 | coda_config rejects unknown top-level keys | ✅ PASS |
| AC-6 | BUILD context includes auto-advance instruction | ✅ PASS |
| AC-7 | Module prompt footer includes coda_report_findings instruction | ✅ PASS |
| AC-8 | No regressions | ✅ PASS |

## Verification Results

```
bun test (core) → 144 pass, 0 fail
bun test (coda) → 254 pass, 0 fail (398 total, +12 new)
tsc --noEmit → clean (both packages)
```

## Module Execution Reports

### Pre-Apply
- **TODD(50):** Test files exist for forge, tools, workflow ✓
- **WALT(100):** Baseline 386 total (144 core + 242 coda), 0 fail

### Post-Task (per-task TODD enforcement)
- **Task 1:** TODD(100) → PASS (scaffold + config tests green)
- **Task 2:** TODD(100) → PASS (build-loop + module-integration tests green)
- **Task 3:** TODD(100) → PASS (398/398, 0 fail)

### Post-Apply Advisory
- **IRIS(250):** 0 anti-patterns in changed files
- **DOCS(250):** No doc drift (internal workflow changes, not user-facing API)
- **RUBY(300):** skip (no debt indicators, all files <500 lines)
- **SKIP(300):** No new formal decisions

### Post-Apply Enforcement
- **WALT(100):** PASS — 398/398, +12 new tests, tsc clean, ↑ improving
- **DEAN(150):** skip (no lockfile for audit)
- **TODD(200):** PASS — 398/398, 0 fail
- **ARCH(125):** PASS — all imports flow downward, no boundary violations, all files <500 lines

## Deviations

- **Extra files modified:** Plan listed 9 files_modified. Actual was 12 — added `pi/__tests__/commands.test.ts` and `pi/__tests__/hooks.test.ts` (stale tool count 8→9 fix) and `workflow/__tests__/module-integration.test.ts` (findings instruction test). All are test file updates supporting planned changes, not scope creep.
- **Task delegation:** Tasks 1 and 2 were delegated to pals-implementer subagents running in parallel. Both returned PASS_WITH_CONCERNS (stale Pi test counts outside their allowed scope). Parent fixed the concern in Task 3.

## Key Patterns

- **Parallel pals-implementer delegation** worked well for independent tasks with clear boundaries. Task 1 (scaffold+config) and Task 2 (build-loop+module-integration) had zero file overlap.
- **coda_config tool** follows the tool-mediated-writes principle — agent uses a validated tool instead of direct file writes, matching the existing coda_* pattern.

## Next Phase

Phase 30: Module Prompts — Architecture + Quality + Knowledge (7 prompt files, 3 registry definitions, structural tests).
