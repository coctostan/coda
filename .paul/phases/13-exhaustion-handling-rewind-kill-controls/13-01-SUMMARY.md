---
phase: 13-exhaustion-handling-rewind-kill-controls
plan: 01
completed: 2026-03-29T17:45:23Z
duration: ~1h
---

## Objective
Add the Phase 13 exhaustion-handling and operator-control slice so REVIEW/VERIFY loops pause cleanly when their iteration budget is exhausted, `/coda advance` can resume the correct human-mediated path, and new `/coda back` and `/coda kill` commands safely rewind or terminate work without deleting historical artifacts.

## What Was Built

| File | Purpose | Lines |
|------|---------|------:|
| `packages/coda/src/workflow/review-runner.ts` | Returns explicit exhausted review outcomes with persisted issue guidance instead of silently continuing | 326 |
| `packages/coda/src/tools/coda-advance.ts` | Handles exhausted-review manual approval and exhausted-verify resume with loop reset semantics | 337 |
| `packages/coda/src/tools/coda-status.ts` | Surfaces exhaustion-specific operator guidance for review and verify | 146 |
| `packages/coda/src/tools/coda-back.ts` | Adds rewind support that preserves artifacts while superseding or reopening active state appropriately | 123 |
| `packages/coda/src/tools/coda-kill.ts` | Adds terminal kill behavior that clears active runtime state without deleting durable issue history | 33 |
| `packages/coda/src/tools/index.ts` | Exposes the new back/kill tools | 48 |
| `packages/coda/src/tools/types.ts` | Extends tool contracts for recovery, rewind, and kill operations | 165 |
| `packages/coda/src/pi/commands.ts` | Routes `/coda advance`, `/coda back`, and `/coda kill` through the Pi command surface | 270 |
| `packages/coda/src/workflow/__tests__/review-runner.test.ts` | Covers exhausted review behavior and preserved issue guidance | 275 |
| `packages/coda/src/workflow/__tests__/verify-runner.test.ts` | Covers exhausted verify behavior and persisted failure-guidance recovery | 257 |
| `packages/coda/src/tools/__tests__/coda-advance.test.ts` | Covers manual approval, verify resume, and loop reset behavior | 327 |
| `packages/coda/src/tools/__tests__/coda-status.test.ts` | Covers operator guidance for exhausted review/verify states | 216 |
| `packages/coda/src/tools/__tests__/coda-back.test.ts` | Covers rewind preservation and supersede semantics | 112 |
| `packages/coda/src/tools/__tests__/coda-kill.test.ts` | Covers terminal kill behavior | 71 |
| `packages/coda/src/pi/__tests__/commands.test.ts` | Covers `/coda advance`, `/coda back`, and `/coda kill` command behavior | 228 |

## Acceptance Criteria Results

| AC | Description | Status | Evidence |
|----|-------------|--------|----------|
| AC-1 | Review and verify exhaustion pause with actionable human paths | PASS | `review-runner.ts` now returns exhausted outcomes with preserved issue guidance; exhausted verify recovery is covered through persisted failure artifacts in `verify-runner.test.ts` and surfaced to operators by `coda-status.ts` |
| AC-2 | Exhaustion resume paths are phase-correct and reset loop state cleanly | PASS | `coda-advance.ts` manually approves exhausted review into BUILD and re-enters VERIFY with `loop_iteration` reset after exhausted verify; covered by `coda-advance.test.ts` and `commands.test.ts` |
| AC-3 | `/coda back` and `/coda kill` preserve history while resetting active state appropriately | PASS | `coda-back.ts` preserves downstream artifacts while superseding or reopening active records and `coda-kill.ts` clears runtime focus while marking the issue terminal; covered by dedicated tool tests |
| AC-4 | Phase 13 remains scoped to exhaustion controls and rewind/kill mechanics | PASS | targeted tests, full `bun test`, and `npx tsc --noEmit` all passed; no Phase 14 `before_agent_start` or broader context-injection work was added |

## Verification Results

| Command | Result |
|---------|--------|
| `bun test packages/coda/src/workflow/__tests__/review-runner.test.ts packages/coda/src/workflow/__tests__/verify-runner.test.ts packages/coda/src/tools/__tests__/coda-advance.test.ts packages/coda/src/tools/__tests__/coda-status.test.ts packages/coda/src/tools/__tests__/coda-back.test.ts packages/coda/src/tools/__tests__/coda-kill.test.ts packages/coda/src/pi/__tests__/commands.test.ts` | PASS (45 tests) |
| `bun test` | PASS (241 tests) |
| `npx tsc --noEmit` | PASS |

## Module Execution Reports
- `[dispatch] pre-unify: 0 modules registered for this hook`
- Phase 13's PLAN/APPLY loop still has no durable module-dispatch evidence because `modules.yaml` was unavailable when the plan was created. UNIFY confirmed that local repo-root `modules.yaml` resolution now works again via symlink, so subsequent loops can dispatch normally.

### WALT — Quality History
| Metric | Value |
|--------|-------|
| Tests | 241 pass / 0 fail |
| Typecheck | clean |
| Lint | not separately tracked in this loop |
| Coverage | not tracked |
| Trend vs last recorded phase | ↑ improving (+19 passing tests vs Phase 11) |

**Side effect:** appended `2026-03-29 | 13-exhaustion-handling-rewind-kill-controls | 241 pass / 0 fail | N/A | clean | N/A | ↑ improving (+19 tests)` to `.paul/quality-history.md`.

### SKIP — Knowledge Capture
## [2026-03-29] Exhausted review and verify loops preserve artifacts and require explicit human recovery
**Type:** decision
**Phase:** 13-exhaustion-handling-rewind-kill-controls
**Related:** `packages/coda/src/workflow/review-runner.ts`, `packages/coda/src/tools/coda-advance.ts`, `packages/coda/src/tools/coda-status.ts`, PR #8

**Context:** Phase 13 needed recovery controls for autonomous review/verify loops without losing revision instructions, verification failures, or active plan context when iteration limits were reached.

**Decision:** Exhausted loops now stop with explicit exhausted outcomes that preserve existing artifacts and surface the valid human next actions instead of auto-advancing, auto-resetting, or deleting state.

**Alternatives considered:**
- Auto-advance exhausted review/verify loops — rejected because it would hide unresolved work and weaken the lifecycle gates.
- Delete or rewrite prior artifacts on exhaustion — rejected because it would destroy the durable audit trail introduced in Phases 10–12.

**Rationale:** Preserving the current artifacts keeps review/verify loops mechanical and auditable while still letting humans recover with explicit approval, fix, rewind, or kill actions.

**Impact:** Future loop controls and Phase 14 context assembly must treat exhaustion as a paused state with durable artifacts, not as an implicit success or reset.

## [2026-03-29] Rewind and kill controls stay inside the existing CODA tool and command surface
**Type:** rationale
**Phase:** 13-exhaustion-handling-rewind-kill-controls
**Related:** `packages/coda/src/tools/coda-back.ts`, `packages/coda/src/tools/coda-kill.ts`, `packages/coda/src/pi/commands.ts`

Phase 13 added rewind and kill behavior by extending the existing CODA tool/command surface instead of introducing a separate operator-control subsystem.

**Key factors:**
- Existing `coda_*` tools already own durable state transitions and Pi command routing.
- Reusing the current surface keeps operator actions discoverable and contained within the documented lifecycle.
- A separate control plane would have widened scope into Phase 14 runtime and context-injection work.

**Impact:** Later operator controls should continue to layer onto `coda_*` tools and `/coda` commands unless the lifecycle model itself changes.

### RUBY — Technical Debt
- ESLint complexity analysis could not run with the installed CLI because it rejected the legacy `--no-eslintrc` flag, so the hook used the documented `wc -l` fallback.
- No changed file exceeded the 500-line critical threshold.
- Warn-level size hotspots remain in `packages/coda/src/tools/coda-advance.ts` (337 lines), `packages/coda/src/tools/__tests__/coda-advance.test.ts` (327 lines), and `packages/coda/src/workflow/review-runner.ts` (326 lines).
- Suggested follow-ups if Phase 14 expands these areas: extract dedicated helpers for exhaustion guidance formatting, manual recovery branching, and review artifact rendering.

- `[dispatch] post-unify: walt(100) → 1 report / 1 side effect | skip(200) → 2 reports / 0 side effects | ruby(300) → 1 report / 0 side effects`

## Deviations
- `packages/coda/src/workflow/verify-runner.ts` was listed in the plan, but Phase 13 did not require a production edit there; the existing failure-artifact model already supported the exhausted-verify recovery path once `coda-advance.ts`, `coda-status.ts`, and tests were updated.
- The ground-truth diff against the `Last commit` recorded in `STATE.md` only showed `.paul/STATE.md` because APPLY postflight advanced bookkeeping after the feature commit landed. UNIFY reconciled Phase 13 against the branch diff to `main` / commit `9924887` instead.
- PLAN/APPLY module dispatch evidence was absent because `modules.yaml` was not yet available when the plan was created. UNIFY corrected that outdated assumption and confirmed the local symlinked registry works for future loops.

## Key Patterns / Decisions
- Exhausted review/verify loops preserve their current artifacts and surface human recovery actions rather than mutating history or auto-advancing.
- `/coda advance` is phase-aware for recovery: exhausted review approves into BUILD, while exhausted verify re-enters VERIFY with `loop_iteration` reset to `0`.
- `/coda back` and `/coda kill` reuse the existing CODA tool and command surface so operator controls stay within the documented lifecycle.

## Next Phase
Phase 14 — Pi Integration Updates.
Next action: run `/paul:plan` for Phase 14.
