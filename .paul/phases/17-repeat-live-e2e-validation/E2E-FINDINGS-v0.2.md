# Phase 17 Findings — Repeat Live E2E Validation

## Baseline
- Date: 2026-03-31T01:44:10Z
- Branch: `feature/13-exhaustion-handling-rewind-kill-controls`
- Commit: `bd9f1ca`
- Plan: `.paul/phases/17-repeat-live-e2e-validation/17-01-PLAN.md`
- Source runbook: `docs/v0.2/E2E-TEST-SCRIPT-v0.2.md`

## Automated Preflight
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

## Live CMUX/Pi Rerun
Status: blocked during Scenario 1 (review trigger)
Transcript: `.paul/phases/17-repeat-live-e2e-validation/CMUX-TRANSCRIPT-v0.2.md`
Fresh temp project: `/var/folders/gw/8yg8rbgd0r7fx_7mlssdcg6c0000gn/T/coda-v02-e2e-XXXX.7BCbSfBzbw`

## Confirmed Live Evidence
- Pi launched successfully against `packages/coda/src/pi/index.ts` in a fresh temp project.
- `coda_create` created the issue, plan, and both planned tasks.
- `coda_advance` moved the focused issue from `specify → plan → review`.
- Persisted live state after the trigger attempt was:
  - `phase: review`
  - `submode: review`
  - `loop_iteration: 0`
- No `revision-instructions.md` artifact was written after the review trigger attempt.

## Exact Blocker
The live autonomous review trigger crashed immediately after `coda_advance` entered `review`:

```text
Extension "/Users/maxwellnewman/pi/workspace/coda/packages/coda/src/pi/index.ts" error:
task.depends_on is not iterable
  at collectDependencyIssues
  (/Users/maxwellnewman/pi/workspace/coda/packages/coda/src/workflow/review-runner.ts:193:35)
```

### Interpretation
This is a real runtime blocker, not just malformed task input from the live prompt flow:
- `tasks/02-implement-subtraction.md` persisted `depends_on` as a proper YAML array (`- 1`)
- `tasks/01-implement-addition.md` has no `depends_on` field at all
- `collectDependencyIssues()` currently iterates `for (const dependencyId of task.depends_on)` without a missing-field guard
- As soon as review inspects a task without `depends_on`, the live trigger path can throw before revision artifacts are written

## Scenario Results
| Scenario | Result | Evidence |
|----------|--------|----------|
| Review → revise | BLOCKED | Live trigger crashed in `collectDependencyIssues()` before `revision-instructions.md` could be written |
| Human-review gate | not reached | blocked by Scenario 1 runtime crash |
| Verify → correct | not reached | blocked by Scenario 1 runtime crash |
| Exhaustion recovery | not reached | blocked by Scenario 1 runtime crash |
| `/coda kill` | not reached | blocked by Scenario 1 runtime crash |
| `/coda back` preservation | not reached | blocked by Scenario 1 runtime crash |

## Deviations
1. **Primary blocker captured instead of full green rerun**
   - Phase 17 was planned to close the milestone on a clean live transcript.
   - APPLY instead found a new runtime blocker in the supported live review trigger path.
2. **Runbook execution required current cmux CLI equivalents**
   - The shipped runbook still shows the older named-session `cmux` syntax.
   - I executed the same flow with the current workspace-based CLI while keeping the functional steps identical.
   - I did not rewrite the runbook in this APPLY because the newly discovered runtime blocker is the main actionable outcome, and a safe systematic cmux syntax rewrite would be secondary to the blocker.

## Recommendation
Do **not** mark v0.2 live validation complete.

A follow-on fix is required before another live rerun can close the milestone:
- make review-runner tolerate tasks with no `depends_on` field (treat as `[]`)
- rerun the canonical CMUX/Pi validation from a fresh baseline after that fix
- then update the runbook if the current cmux CLI syntax still needs a documented refresh

## Outcome
- Automated evidence remains green.
- Live evidence remains blocked by a reproducible runtime crash in the review trigger path.
- Phase 17 produced the exact transcript and blocker needed for the next correction/unify decision, but it did **not** close the milestone on fully green live evidence.
