---
phase: 16-live-operator-trigger-resolution
plan: 01
completed: 2026-03-30T23:21:31Z
duration: approximate
---

## Objective
Restore a supported live operator-facing trigger so a Pi session can enter the autonomous review/revise and verify/correct loops immediately after `/coda advance` reaches `review` or `verify`.

## What Was Built

| File | Purpose | Notes |
|------|---------|-------|
| `packages/coda/src/pi/hooks.ts` | Added shared autonomous advance-trigger orchestration for review/verify | Runs `runReviewRunner` / `runVerifyRunner`, persists outcomes, and queues revise/correct follow-up turns (`+195/-3`) |
| `packages/coda/src/pi/commands.ts` | Routed `/coda advance` through the shared trigger helper | Operator notifications now include autonomous-trigger outcomes (`+9/-5`) |
| `packages/coda/src/pi/__tests__/commands.test.ts` | Added command-surface regression coverage | Proves advancing into `review` runs autonomous review and queues revise follow-up (`+106/-6`) |
| `packages/coda/src/pi/__tests__/hooks.test.ts` | Added hook-surface regression coverage | Proves `tool_result` on `coda_advance` triggers autonomous verify and queues correction follow-up (`+103/-11`) |
| `packages/coda/src/workflow/__tests__/autonomous-loops-e2e.test.ts` | Preserved integrated autonomous-loop coverage for the supported trigger path | Durable regression evidence carried forward on this branch alongside the Phase 16 trigger fix (`491 lines`) |
| `docs/v0.2/E2E-TEST-SCRIPT-v0.2.md` | Aligned the canonical runbook with the supported trigger path | Documents `coda_advance` plus the extension-managed follow-up turn as the supported live behavior (`453 lines`) |

## Acceptance Criteria Results

| AC | Description | Status | Evidence |
|----|-------------|--------|----------|
| AC-1 | Supported live trigger enters review/revise | PASS | `handleAutonomousAdvanceTrigger()` runs the review runner after successful advance into `review`; command regression proves revise instructions + follow-up queueing |
| AC-2 | Supported live trigger enters verify/correct | PASS | `tool_result` hook invokes the shared trigger helper after successful `coda_advance` into `verify`; hook regression proves correction artifacts + follow-up queueing |
| AC-3 | Pi contract and runbook stay aligned | PASS | The canonical v0.2 runbook now states the supported `coda_advance` + extension follow-up path, and automated regressions assert the same operator-visible behavior |

## Verification Results

### Targeted trigger regression suite
```bash
bun test packages/coda/src/pi/__tests__/commands.test.ts packages/coda/src/pi/__tests__/hooks.test.ts packages/coda/src/workflow/__tests__/autonomous-loops-e2e.test.ts
```
Result: 28 pass, 0 fail

### Repo-wide verification
```bash
bun test
npx tsc --noEmit
```
Results:
- `bun test`: 253 pass, 0 fail
- `npx tsc --noEmit`: pass

### Bounded live Pi / CMUX repro
A bounded live repro was attempted during APPLY, but direct workspace/surface control in this harness remained unreliable. The note is carried forward as Phase 17 validation scope instead of reopening implementation work inside Phase 16.

## Module Execution Reports
- [dispatch] pre-unify: 0 modules registered for this hook
- [dispatch] post-unify: walt(100) → 1 report / 1 side effect | skip(200) → 1 report / 0 side effects | ruby(300) → 1 report / 0 side effects

### WALT report
- Appended `2026-03-30 | 16-live-operator-trigger-resolution | 253 pass / 0 fail | N/A | clean | N/A | ↑ improving (+2 tests) |` to `.paul/quality-history.md`.

### SKIP knowledge capture
## [2026-03-30] Live autonomous trigger runs on `coda_advance` plus an extension-managed follow-up

**Type:** decision
**Phase:** 16 — Live Operator Trigger Resolution
**Related:** `packages/coda/src/pi/commands.ts`, `packages/coda/src/pi/hooks.ts`, `docs/v0.2/E2E-TEST-SCRIPT-v0.2.md`

**Context:** Phase 15 proved the workflow primitives were correct in tests but showed that a live Pi session could reach `review` or `verify` without actually launching the autonomous runner from the supported operator surface.

**Decision:** Treat a successful `coda_advance` into `review` or `verify` as the supported operator trigger, run the deterministic runner immediately from the extension layer, and queue revise/correct work through Pi follow-up messaging when the runner produces more work.

**Alternatives considered:**
- Add separate slash commands for review/verify triggers — rejected because it widens the operator surface beyond the documented `/coda advance` flow.
- Move trigger semantics into the core state machine — rejected because runner execution is Pi/workflow orchestration, not a core transition rule.

**Rationale:** This closes the live gap while keeping review/verify semantics inside `runReviewRunner` / `runVerifyRunner` and keeping the operator contract truthful.

**Impact:** Phase 17 can now re-run the canonical live script against a supported trigger path without hidden internal steps beyond the already-documented focused-state bootstrap.

## [2026-03-30] Harness-limited live repros belong in the dedicated validation phase

**Type:** lesson
**Phase:** 16 — Live Operator Trigger Resolution
**Related:** `docs/v0.2/E2E-TEST-SCRIPT-v0.2.md`, `.paul/phases/16-live-operator-trigger-resolution/16-01-SUMMARY.md`

**What happened:** APPLY included a bounded live CMUX/Pi repro, but direct workspace and surface control in this harness remained unreliable.

**What we learned:** Once automated coverage and runbook alignment are green, a flaky harness repro should be documented and carried into the dedicated validation phase instead of reopening trigger implementation scope.

**How to apply:** Keep Phase 17 focused on a clean live rerun and transcript capture, not more Phase 16 trigger churn.

### RUBY report
- ESLint complexity fallback was required because the local ESLint CLI rejected the `--no-eslintrc` flag expected by the module prompt.
- File-size scan found no oversized production files, but flagged growing test hotspots:
  - `packages/coda/src/pi/__tests__/hooks.test.ts` — 547 lines (critical)
  - `packages/coda/src/workflow/__tests__/autonomous-loops-e2e.test.ts` — 491 lines (warn)
  - `packages/coda/src/pi/__tests__/commands.test.ts` — 482 lines (warn)
- Suggested follow-up: extract shared temporary CODA-project setup helpers before adding more Phase 17 coverage.

## Deviations
1. **`packages/coda/src/pi/index.ts` did not require a code change**
   - The plan listed the entry point as a possible touchpoint, but sharing trigger logic between `commands.ts` and `hooks.ts` resolved the operator gap without modifying registration wiring.
2. **Phase 15 documentation/test artifacts landed together with the Phase 16 transition work on this branch**
   - This branch predates the earlier local Phase 15 baseline, so the canonical runbook and integrated autonomous-loop E2E file were carried forward here while closing Phase 16.
   - Impact: the branch now contains the needed Phase 15/16 evidence without reopening APPLY scope.
3. **Live repro evidence remains bounded rather than a clean full transcript**
   - The harness-level CMUX/Pi control issue was documented and carried into Phase 17, which owns the clean rerun.

## Key Patterns / Decisions
- The supported operator-facing trigger is a successful `coda_advance` into `review` or `verify`, not a hidden manual runner invocation.
- Trigger orchestration is shared between slash-command handling and the `tool_result` hook so live commands and tool calls stay aligned.
- Review/verify decision logic remains inside `runReviewRunner` / `runVerifyRunner`; Pi only orchestrates trigger timing, persistence, and follow-up messaging.

## Next Phase
Phase 17 — Repeat Live E2E Validation.
Run `/paul:plan` to define the clean-baseline rerun and transcript capture scope.