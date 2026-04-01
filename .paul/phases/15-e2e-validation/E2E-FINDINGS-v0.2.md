# Phase 15 Findings — v0.2 E2E Validation

## Status
Partial validation completed. Automated preflight passed. Live CMUX/Pi validation uncovered a reproducible runbook/runtime gap before the full scripted flow could complete.

## Scope Executed
- Automated scenario coverage for the four required v0.2 flows
- Targeted workflow/tool/Pi regression suite
- Full repo test suite
- Typecheck
- Live CMUX/Pi execution attempt of `docs/v0.2/E2E-TEST-SCRIPT-v0.2.md`

## Automated Preflight Results

### Added coverage
- `packages/coda/src/workflow/__tests__/autonomous-loops-e2e.test.ts`
  - review → revise remains durable across runner, status, command, and hook surfaces
  - verify → correct exposes failure lineage across runner, status, and hook context
  - pending human review blocks build until a human decision is recorded
  - exhausted-loop recovery preserves evidence and routes operators through advance, back, and kill

### Targeted scenario suite
```bash
bun test packages/coda/src/workflow/__tests__/autonomous-loops-e2e.test.ts packages/coda/src/workflow/__tests__/review-runner.test.ts packages/coda/src/workflow/__tests__/verify-runner.test.ts packages/coda/src/pi/__tests__/hooks.test.ts packages/coda/src/pi/__tests__/commands.test.ts packages/coda/src/tools/__tests__/coda-status.test.ts packages/coda/src/tools/__tests__/coda-advance.test.ts packages/coda/src/tools/__tests__/coda-back.test.ts packages/coda/src/tools/__tests__/coda-kill.test.ts
```
Result: 65 pass, 0 fail

### Full repo verification
```bash
bun test
npx tsc --noEmit
```
Results:
- `bun test`: 251 pass, 0 fail
- `npx tsc --noEmit`: pass

## Live CMUX/Pi Validation

### Environment
- `cmux`: available
- `pi`: available
- Extension loaded: `packages/coda/src/pi/index.ts`
- Test project scaffolded from the canonical v0.2 script

### What succeeded live
1. Started a live Pi session inside CMUX on a fresh test project.
2. Used `coda_create` to create the `add-calculator` issue.
3. Bootstrapped `.coda/state.json` with a focused issue so `coda_advance` had runtime state.
4. Used `coda_advance` to move `specify → plan`.
5. Used `coda_create` to create a plan plus two flawed tasks covering only `AC-1` and `AC-2`.
6. Used `coda_advance` to move `plan → review`.
7. Used `coda_status` live and confirmed:
   - `phase: review`
   - `submode: review`
   - `loop_iteration: 0`
   - next action remained `Review and approve the plan, then advance to build`

### Reproducible live finding
After waiting in the live Pi session and checking status again, the flawed review state did **not** transition automatically into `revise`.

Observed result:
- phase remained `review`
- submode remained `review`
- no revision instructions were created by the live operator flow alone

### Interpretation
The shipped automated workflow primitives are correct and fully covered by tests, but the canonical live runbook was not directly executable end-to-end as written because:
1. it did not bootstrap `.coda/state.json` / `focus_issue` before calling `coda_advance`
2. the live operator flow used in the script did not itself trigger the review runner after entering `review`

## Narrow Fixes Applied During Phase 15
1. Added integrated scenario coverage in:
   - `packages/coda/src/workflow/__tests__/autonomous-loops-e2e.test.ts`
2. Narrowly updated `docs/v0.2/E2E-TEST-SCRIPT-v0.2.md` to bootstrap focused runtime state for the scripted issue before using `coda_advance`

## Acceptance Criteria Status
- AC-1 Review / revise and human-review gating validated end-to-end
  - **Automated:** pass
  - **Live CMUX/Pi:** blocked by missing live trigger from review into revise
- AC-2 Verify / correct validated end-to-end
  - **Automated:** pass
  - **Live CMUX/Pi:** not reached due earlier live-flow blocker
- AC-3 Exhausted-loop recovery controls validated end-to-end
  - **Automated:** pass
  - **Live CMUX/Pi:** not reached due earlier live-flow blocker
- AC-4 Validation reproducible from current clean baseline
  - **Automated repo verification:** pass
  - **Canonical live runbook:** partially corrected, but still not fully successful end-to-end

## Deferred Follow-up
1. Decide the intended live operator trigger for entering autonomous review/verify loops in a CMUX/Pi session.
2. Update the canonical live runbook to use that trigger explicitly, or expose a supported operator-facing mechanism that makes the documented flow executable without internal knowledge.
3. Re-run the full live CMUX/Pi script after that decision and record a fully green live transcript.

## Proposed Follow-on Phases
1. **Phase 16 — Live Operator Trigger Resolution**
   - clarify the intended operator-facing trigger that should cause review/verify runners to execute in a live Pi session
   - fix the narrow runtime/operator-surface gap or align the runbook with the supported trigger
   - verify the fix with targeted automated coverage and a bounded live repro
2. **Phase 17 — Repeat Live E2E Validation**
   - re-run the canonical `docs/v0.2/E2E-TEST-SCRIPT-v0.2.md` flow from a clean baseline
   - record a fully green live CMUX/Pi transcript and final findings
   - confirm the milestone closes with both automated and live evidence

## Recommendation
Do not mark Phase 15 live validation complete yet. The automated validation gate is green, but the canonical live CMUX/Pi run remains blocked on an operator-surface/runtime integration gap.
