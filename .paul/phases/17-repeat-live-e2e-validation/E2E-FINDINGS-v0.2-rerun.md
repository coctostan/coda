# Phase 17 Findings — Post-Fix Live Rerun

## Baseline
- Date: 2026-04-01
- Branch: `fix/live-rerun-post-guard-fix` (from `main` at `43e2e5b` with the array guard fix merged)
- Tests: 255 pass, 0 fail
- Typecheck: `npx tsc --noEmit` clean
- Audit: `bun audit --json` clean

## Live CMUX/Pi Rerun
Status: **PASSED** — the previously blocked review trigger now works end-to-end.
Transcript: `.paul/phases/17-repeat-live-e2e-validation/CMUX-TRANSCRIPT-v0.2-rerun.md`

## Scenario Results
| Scenario | Result | Evidence |
|----------|--------|----------|
| Review → revise | ✅ PASS | Review found AC-3 uncovered, wrote `revision-instructions.md`, entered `revise`, created task 03, re-review approved |
| Human-review gate | ✅ PASS | Plan `human_review_status` updated to `approved` during review flow |
| Verify → correct | ✅ PASS (clean) | Agent implemented all 3 ACs during BUILD; autonomous verify confirmed all met — no corrections needed |
| Exhaustion recovery | ⬜ automated only | Covered by 255-test suite including exhaustion scenarios; not exercised in this live flow |
| `/coda kill` | ⬜ automated only | Covered by test suite; not exercised in this live flow |
| `/coda back` preservation | ⬜ automated only | Covered by test suite; not exercised in this live flow |

## Key Evidence
1. **The fix worked.** Task 01 had no `depends_on` field. The `loadTasks()` normalization defaulted it to `[]`. The review runner iterated all tasks without crashing.
2. **The full review → revise → re-review → build → verify flow completed autonomously** in a single live session without manual intervention.
3. **revision-instructions.md** was written with correct content: `AC-3 not covered by any task`.
4. **State transitions** were correct throughout: `specify → plan → review/review → review/revise → review/review → build → verify/verify`.

## Comparison with Previous Run
| Check | Previous (Phase 17 APPLY) | This Rerun |
|-------|--------------------------|------------|
| Review trigger | ❌ Crashed: `task.depends_on is not iterable` | ✅ Passed |
| revision-instructions.md | ❌ Not written | ✅ Written with AC-3 gap |
| Revise task created | ❌ Not reached | ✅ Task 03 created |
| Verify | ❌ Not reached | ✅ All ACs met |

## Recommendation
**v0.2 live validation is now sufficient to close the milestone.**

- The core live trigger path (review + verify) is proven working post-fix.
- Exhaustion, kill, and back scenarios are proven by 255 automated tests but were not independently exercised in this particular live session.
- The automated + live evidence together cover all 4 required v0.2 capabilities.
