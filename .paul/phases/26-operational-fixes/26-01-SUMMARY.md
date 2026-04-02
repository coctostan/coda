---
phase: 26-operational-fixes
plan: 01
completed: 2026-03-29T14:00:00Z
duration: ~45 minutes
---

## Objective

Fix all 10 known operational issues (LIVE-01 through LIVE-10) blocking live CODA Pi/CMUX sessions.

## What Was Built

| File | Purpose | Change |
|------|---------|--------|
| `packages/coda/src/tools/path-validation.ts` | NEW — sandbox path validation | `validateRecordPath()` blocks `../` traversal |
| `packages/coda/src/tools/sort-utils.ts` | NEW — numeric filename sorting | `sortByNumericSuffix()` for plan files |
| `packages/coda/src/tools/coda-report-findings.ts` | NEW — runtime findings persistence tool | Agent calls this to submit module findings |
| `packages/coda/src/tools/coda-read.ts` | Path validation applied | Uses `validateRecordPath()` |
| `packages/coda/src/tools/coda-update.ts` | Path validation applied | Uses `validateRecordPath()` |
| `packages/coda/src/tools/coda-edit-body.ts` | Path validation + create_if_missing | Sandbox check + record creation |
| `packages/coda/src/tools/coda-run-tests.ts` | Shell injection fix | `Bun.spawnSync` with args array, explicit cwd |
| `packages/coda/src/tools/coda-advance.ts` | Numeric sort + findings guard | Plan lookup + build→verify findings check |
| `packages/coda/src/tools/coda-status.ts` | Numeric sort | Plan listing |
| `packages/coda/src/tools/coda-back.ts` | Numeric sort | History lookup |
| `packages/coda/src/tools/index.ts` | Exports | New modules exported |
| `packages/coda/src/pi/commands.ts` | Forge wired + error handling | `scaffoldCoda()` + try/catch |
| `packages/coda/src/pi/hooks.ts` | Error handling + write gate | try/catch + expanded blocked commands |
| `packages/coda/src/pi/index.ts` | Explicit project root | `projectRoot` captured at init |
| `packages/coda/src/pi/tools.ts` | New tool + error handling | `coda_report_findings` registered + try/catch |
| `packages/coda/src/workflow/build-loop.ts` | Post-task/post-build dispatch | Module prompts at task/build boundaries |
| `packages/coda/src/workflow/context-builder.ts` | Numeric sort | `loadPlan()` uses numeric sort |
| `packages/coda/src/workflow/module-integration.ts` | Prompt injection update | Findings tool instruction appended |
| `packages/coda/src/workflow/review-runner.ts` | Numeric sort | Plan resolution |

## Acceptance Criteria Results

| AC | Description | Status |
|----|-------------|--------|
| AC-1 | Path traversal blocked | ✅ PASS |
| AC-2 | Shell injection fixed | ✅ PASS |
| AC-3 | Forge wired | ✅ PASS |
| AC-4 | Findings persisted at runtime | ✅ PASS |
| AC-5 | Post-task/post-build dispatch | ✅ PASS |
| AC-6 | create_if_missing honored | ✅ PASS |
| AC-7 | Explicit project root | ✅ PASS |
| AC-8 | Error handling in entrypoints | ✅ PASS |
| AC-9 | Numeric plan sorting | ✅ PASS |
| AC-10 | Write gate strengthened | ✅ PASS |
| AC-11 | No regressions | ✅ PASS |

## Verification Results

```
# Core
bun test (core) → 144 pass, 0 fail

# Coda
bun test (coda) → 237 pass, 0 fail (381 total)

# TypeScript
packages/core tsc --noEmit → clean
packages/coda tsc --noEmit → clean
```

## Module Execution Reports

### APPLY Phase Dispatch
- **Pre-apply:** TODD(50) → test files exist | WALT(100) → baseline 363 total
- **Post-task:** TODD(100) → PASS on all 4 tasks (+18 new tests)
- **Advisory:** IRIS(250) → 0 annotations | DOCS/RUBY/SKIP → skip
- **Enforcement:** WALT(100) → PASS (381/381, +18 new, tsc clean) | DEAN(150) → skip | TODD(200) → PASS

### Post-Unify Dispatch
- **WALT(100):** Quality history updated — 381 pass / 0 fail, tsc clean, ↑ improving (+18 tests)
- **SKIP(200):** D6 captured (coda_report_findings approach)
- **RUBY(300):** skip (fixes only, no new complexity concerns)

## Deviations

- **LIVE-02 approach:** Used explicit `coda_report_findings` tool instead of intercepting agent responses. Pi doesn't expose `after_agent_turn` hook, making response interception unreliable. The tool approach is more robust — the module prompt instructs the agent to call it.
- **verify-runner.ts unchanged:** Its `.sort()` operates on failure artifacts, not plan files. Correct to leave unchanged.
- **coda-kill.ts unchanged:** Already minimal, no unsafe patterns.

## Key Decisions

- **D6:** `coda_report_findings` explicit tool approach for findings persistence — agent submits findings via tool call rather than passive response interception. More reliable, Pi API compatible.

## Next Phase

Phase 27: Deep Code Review + Fixes — production-readiness review catching anything the sweep missed.
