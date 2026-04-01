---
phase: 17-repeat-live-e2e-validation
plan: 01
completed: 2026-03-31T01:55:00Z
duration: approximate
---

## Objective
Re-run the canonical v0.2 CMUX/Pi validation from a clean baseline and capture a fully green live transcript closing the milestone on live evidence.

## What Was Built

| File | Purpose | Notes |
|------|---------|-------|
| `.paul/phases/17-repeat-live-e2e-validation/CMUX-TRANSCRIPT-v0.2.md` | Live CMUX/Pi execution transcript | ~932 lines capturing the exact commands, screen reads, and runtime crash evidence |
| `.paul/phases/17-repeat-live-e2e-validation/E2E-FINDINGS-v0.2.md` | Scenario-by-scenario findings and blocker record | Includes baseline verification, confirmed evidence, exact blocker, and recommendation |

## Acceptance Criteria Results

| AC | Description | Status | Evidence |
|----|-------------|--------|----------|
| AC-1 | Review/revise and human-review gating pass in the live rerun | BLOCKED | Live review trigger crashed in `collectDependencyIssues()` before revision artifacts could be written; later scenarios not reached |
| AC-2 | Verify/correct and recovery controls pass in the live rerun | not reached | Blocked by AC-1 runtime crash |
| AC-3 | Final live evidence closes the milestone without widening scope | Partial | Automated baseline is green (253 pass, tsc clean); live evidence captured the exact blocker instead of a fully green transcript |

## Verification Results

### Automated preflight (before live run)
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

### Live CMUX/Pi execution
- Pi launched successfully in a fresh temp project
- `coda_create` created the issue, plan, and both tasks
- `coda_advance` moved through `specify → plan → review`
- The live review trigger crashed: `task.depends_on is not iterable` at `review-runner.ts:193`
- No revision-instructions artifact was written
- Remaining scenarios were not reached

## Module Execution Reports
- `[dispatch] pre-unify: 0 modules registered for this hook`
- `[dispatch] post-unify: walt(100) → 1 report / 1 side effect | skip(200) → 1 report / 0 side effects | ruby(300) → 1 report / 0 side effects`
### WALT report
- Appended `2026-03-31 | 17-repeat-live-e2e-validation | 253 pass / 0 fail | N/A | clean | N/A | → stable (validation-only phase, live blocker documented) |` to `.paul/quality-history.md`.

### SKIP knowledge capture

## [2026-03-31] Live review trigger crashes on tasks without `depends_on`

**Type:** lesson
**Phase:** 17 — Repeat Live E2E Validation
**Related:** `packages/coda/src/workflow/review-runner.ts`, `.paul/phases/17-repeat-live-e2e-validation/CMUX-TRANSCRIPT-v0.2.md`

**What happened:** The live CMUX/Pi rerun crashed at the first autonomous review trigger because `collectDependencyIssues()` iterates `task.depends_on` without guarding for `undefined`. Task 1, created live via the LLM prompt surface, had no `depends_on` field.

**Root cause:** Automated test fixtures always supply `depends_on`, so the missing-field path was never exercised. Live-created tasks can omit optional frontmatter fields.

**Lesson:** Guard all optional frontmatter array fields with a default (`?? []`) before iteration, and add at least one regression test per runner that exercises the missing-field case.

**Action items:**
- Add `const deps = task.depends_on ?? [];` guard in `collectDependencyIssues()`
- Add a regression test with a task that omits `depends_on`
- Rerun the live CMUX/Pi validation after the fix
### RUBY report
- No source files were changed in this validation-only phase. File-size and complexity analysis is not applicable.
- The existing test hotspots flagged in Phase 16 (`hooks.test.ts` 547 lines, `autonomous-loops-e2e.test.ts` 491 lines, `commands.test.ts` 482 lines) remain unchanged.
## Deviations
1. **Primary blocker captured instead of full green rerun**
   - Phase 17 was planned to close the milestone with clean live evidence.
   - APPLY found a runtime blocker in `collectDependencyIssues()` when a task has no `depends_on` field.
   - Impact: milestone remains open; a one-line guard fix is needed before the next rerun attempt.
2. **Runbook execution used current cmux CLI equivalents**
   - The shipped runbook still shows older named-session `cmux` syntax (`cmux new-split --name e2e --size 60`).
   - I executed the same flow with the current workspace-based CLI while keeping the functional steps identical.
   - Impact: the runbook needs a systematic cmux syntax refresh, but this is secondary to the runtime blocker.
3. **Branch renamed from `feature/13-exhaustion-handling-rewind-kill-controls` to `feature/v0.2-autonomous-loops`**
   - The old name no longer matched the accumulated scope (Phases 13–17).

## Key Patterns / Decisions
- The `collectDependencyIssues()` crash proves that automated test fixtures always provide `depends_on`, so the missing-field path was never exercised in unit/integration tests. Live-created tasks via the LLM prompt surface can omit optional fields.
- Phase 17 correctly captured the exact blocker and stopped instead of widening scope into a runtime fix — preserving the validation-only boundary set in the plan.

## Next Phase
The v0.2 milestone is **not closed**.

Required follow-on:
1. Fix `collectDependencyIssues()` to treat missing `depends_on` as `[]` (one-line guard)
2. Add a regression test for the missing-field case
3. Repeat the live CMUX/Pi validation from a fresh baseline
4. Optionally refresh the runbook's cmux syntax to match the current CLI
