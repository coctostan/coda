---
phase: 56-lifecycle-first-prompts
plan: 01
subsystem: workflow
tags: [lifecycle-prompts, coda_forge, coda_focus, coda_status, pi-hooks, workflow]
requires:
  - phase: 53-agent-entry-points
    provides: [agent-callable coda_forge and coda_focus entry tools]
  - phase: 55-supporting-systems-repair
    provides: [hardened Pi perimeter, shared config loading, stable prompt surfaces]
provides:
  - issue-first bootstrap prompt for unfocused CODA sessions
  - phase-local lifecycle next-step guidance in focused prompts
  - aligned tool-oriented next_action wording across status and entry surfaces
affects:
  - 57-e2e-re-validation
  - pi session entry behavior
  - workflow guidance surfaces
tech-stack:
  added: []
  patterns:
    - existing prompt surfaces should name the next CODA tool step explicitly
    - unfocused sessions should bootstrap into forge/create/focus instead of returning silent context
    - build prompts should direct agents to trust injected workflow guidance before source spelunking
key-files:
  created: []
  modified:
    - packages/coda/src/pi/hooks.ts
    - packages/coda/src/workflow/phase-runner.ts
    - packages/coda/src/workflow/build-loop.ts
    - packages/coda/src/tools/coda-status.ts
    - packages/coda/src/workflow/issue-activation.ts
    - packages/coda/src/tools/coda-forge.ts
key-decisions:
  - "Decision: keep Phase 56 inside existing prompt and next_action surfaces instead of adding a new prompt framework"
  - "Decision: use before_agent_start bootstrap guidance for unfocused sessions rather than returning {}"
  - "Decision: standardize issue-first wording around coda_create, coda_focus, coda_status, and coda_advance"
patterns-established:
  - "Pattern: before_agent_start should emit visible CODA bootstrap guidance when focus_issue/phase is absent"
  - "Pattern: phase prompts should state both the current lifecycle job and the next CODA action"
  - "Pattern: status and entry tools should hand off with concrete tool names, not generic prose"
duration: 27m
started: 2026-04-17T01:02:00Z
completed: 2026-04-17T01:29:10Z
---

# Phase 56 Plan 01: Lifecycle-First Prompts Summary

**CODA now bootstraps unfocused sessions into forge/create/focus, reinforces lifecycle-local next steps during execution, and aligns status/focus/forge guidance around issue-first tool usage.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | 27m |
| Started | 2026-04-17T01:02:00Z |
| Completed | 2026-04-17T01:29:10Z |
| Tasks | 3 completed |
| Files modified | 12 scoped source/test files |

## Objective

Strengthen CODA's injected guidance so an agent naturally enters the lifecycle with `coda_forge` / `coda_create` / `coda_focus`, stays inside the expected phase behavior, and relies on injected tool guidance instead of reading CODA source to discover workflow mechanics.

## What Was Built

| File | Change | Purpose |
|------|--------|---------|
| `packages/coda/src/pi/hooks.ts` | +29 / -2 | Added compact unfocused bootstrap guidance for missing/unfocused state in `before_agent_start`. |
| `packages/coda/src/pi/__tests__/hooks.test.ts` | +39 / -2 | Pinned no-state and unfocused bootstrap guidance expectations. |
| `packages/coda/src/workflow/phase-runner.ts` | +19 / -5 | Added phase-local lifecycle prompts for specify/plan/review/verify without changing context assembly order. |
| `packages/coda/src/workflow/__tests__/phase-runner.test.ts` | +7 / -0 | Added assertions for explicit lifecycle next-step guidance in focused prompts. |
| `packages/coda/src/workflow/build-loop.ts` | +7 / -3 | Strengthened BUILD task protocol and system prompt with CODA-first next-step reminders. |
| `packages/coda/src/workflow/__tests__/build-loop.test.ts` | +4 / -1 | Pinned BUILD anti-spelunking and task-protocol wording. |
| `packages/coda/src/tools/coda-status.ts` | +20 / -25 | Reworked `next_action` strings to be tool-oriented and issue-first across lifecycle states. |
| `packages/coda/src/tools/__tests__/coda-status.test.ts` | +21 / -8 | Added coverage for no-state, unfocused, build, done, review, verify, and UNIFY guidance strings. |
| `packages/coda/src/workflow/issue-activation.ts` | +10 / -9 | Aligned `focusIssue()`/`coda_focus` next_action wording with explicit CODA tool flow. |
| `packages/coda/src/workflow/__tests__/issue-activation.test.ts` | +11 / -1 | Tightened focus next_action expectations for focused/already-focused flows. |
| `packages/coda/src/tools/coda-forge.ts` | +3 / -3 | Updated forge handoff wording to create-and-focus the next issue. |
| `packages/coda/src/tools/__tests__/coda-forge.test.ts` | +3 / -2 | Pinned greenfield and already-initialized forge next_action wording. |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Unfocused sessions receive an issue-first CODA bootstrap prompt | Pass | `before_agent_start` now returns a bootstrap `systemPrompt` + visible `coda-context` message for no-state and unfocused-state cases, including `coda_forge`, `coda_create`, `coda_focus`, `coda_status`, and anti-spelunking guidance. |
| AC-2: Focused lifecycle prompts reinforce CODA-first behavior without bloating context | Pass | `phase-runner.ts` now names the lifecycle job + next `coda_advance` step for specify/plan/review/verify, and `build-loop.ts` reinforces task-protocol / anti-source-spelunking guidance while keeping loading order and sequencing intact. |
| AC-3: Status and entry tools return concrete tool-oriented `next_action` hints | Pass | `coda_status`, `focusIssue()`/`coda_focus`, and `coda_forge` now align on `coda_create` → `coda_focus` entry behavior and explicit per-phase tool steps. |
| AC-4: Quality bar holds | Pass | `bun test` is green at `722 pass / 1 todo / 0 fail`; no dependencies added; no new `TODO/FIXME/HACK/XXX` markers; protected files remained untouched; `hooks.ts` finished at 485 lines. |

## Verification Results

| Command | Result |
|---------|--------|
| `bun test packages/coda/src/pi/__tests__/hooks.test.ts packages/coda/src/workflow/__tests__/phase-runner.test.ts packages/coda/src/workflow/__tests__/build-loop.test.ts packages/coda/src/tools/__tests__/coda-status.test.ts packages/coda/src/workflow/__tests__/issue-activation.test.ts packages/coda/src/tools/__tests__/coda-forge.test.ts` | PASS — 66 pass / 0 fail |
| `bun test` | PASS — 722 pass / 1 todo / 0 fail |
| `grep -rn 'TODO\|FIXME\|HACK\|XXX' ...` across touched production files | PASS — no matches |
| `npx eslint --no-config-lookup --rule 'complexity: [warn, 10]' --rule 'no-unused-vars: warn' --format json ...` on changed files | PASS — no complexity or unused-var issues |
| `git diff --stat -- packages/core/src packages/coda/src/tools/write-gate.ts packages/coda/src/tools/coda-advance.ts` | PASS — no protected-scope diffs |
| `bun audit --json` | PASS with acknowledged baseline — unchanged at 1 critical / 3 high / 0 moderate / 0 low |

## Module Execution Reports

### APPLY carry-forward
- IRIS: ESLint complexity / unused-var scan on changed files found no issues.
- DOCS: `README.md` drift detected; no `CHANGELOG.md` present; no nearby source docs for touched files.
- WALT: post-apply quality gate passed (`bun test` green).
- DEAN: dependency audit unchanged versus acknowledged baseline (`1 critical / 3 high`).
- TODD: targeted suites and full suite passed; TDD-oriented prompt changes stayed inside scoped files.
- `[dispatch] pre-unify: 0 modules registered for this hook`
### Post-UNIFY
- `[dispatch] post-unify: WALT(100) → 1 report / 1 side effect | SKIP(200) → 4 reports / 0 side effects | RUBY(300) → 1 report / 0 side effects`

#### WALT — Quality Delta
| Metric | Before | After | Delta | Trajectory |
|--------|--------|-------|-------|------------|
| Tests passing | 720 | 722 | +2 | ▲ improved |
| Tests failing | 0 | 0 | 0 | ● stable |
| Coverage | N/A | N/A | — | — skipped |
| Lint issues | clean | clean | 0 | ● stable |
| Typecheck | clean (bun test as de-facto type check) | clean (bun test as de-facto type check) | 0 | ● stable |

**Overall:** ▲ improved

**Side effect:** Appended `| 2026-04-17 | 56-lifecycle-first-prompts | 722 pass / 0 fail | N/A | clean (ESLint advisory check clean) | N/A | ↑ improving (+2 tests; lifecycle-first prompt guidance and next_action coverage expanded) |` to `.paul/quality-history.md`.

#### SKIP — Knowledge Capture
## [2026-04-17] Keep lifecycle guidance inside existing prompt surfaces
**Type:** decision
**Phase:** 56 of 57 (Lifecycle-First Prompts)
**Related:** `packages/coda/src/pi/hooks.ts`, `packages/coda/src/workflow/phase-runner.ts`, `packages/coda/src/workflow/build-loop.ts`, PR #24

**Context:** Phase 53 already delivered the missing agent-callable tools. Phase 56 needed to change behavior, not add another framework layer.

**Decision:** Strengthen the existing bootstrap, phase-runner, build-loop, and next_action surfaces instead of introducing a new prompt framework or lifecycle surface.

**Alternatives considered:**
- Add a new prompt framework/config layer — rejected because it would widen scope and add plumbing without proving the existing surfaces were insufficient.
- Change lifecycle state-machine behavior — rejected because F3/F4 were steering failures, not state-transition failures.

**Rationale:** The fastest sound path was to reinforce the prompts and handoff text the agent already receives.

**Impact:** Future lifecycle guidance work should prefer improving existing injection points before adding new infrastructure.

## [2026-04-17] Bootstrap unfocused sessions in before_agent_start
**Type:** decision
**Phase:** 56 of 57 (Lifecycle-First Prompts)
**Related:** `packages/coda/src/pi/hooks.ts`, `packages/coda/src/pi/__tests__/hooks.test.ts`, PR #24

**Context:** Unfocused sessions returned `{}` and gave the agent no explicit issue-first entry path.

**Decision:** Emit a visible CODA bootstrap prompt when `focus_issue` / `phase` is absent, including forge/create/focus/status guidance and an anti-spelunking rule.

**Alternatives considered:**
- Keep the unfocused path silent — rejected because it directly reproduced the build-first behavior from the E2E findings.
- Move bootstrap guidance into slash-command UX only — rejected because Phase 53's goal was agent-callable entry without slash-command dependence.

**Rationale:** `before_agent_start` is the first reliable hook where CODA can redirect the agent before it starts building or reading source.

**Impact:** Unfocused sessions now have an explicit lifecycle entry contract and test coverage for no-state and unfocused-state bootstrapping.

## [2026-04-17] Standardize next_action wording around concrete CODA tools
**Type:** decision
**Phase:** 56 of 57 (Lifecycle-First Prompts)
**Related:** `packages/coda/src/tools/coda-status.ts`, `packages/coda/src/workflow/issue-activation.ts`, `packages/coda/src/tools/coda-forge.ts`, PR #24

**Context:** Status and entry surfaces used generic prose that did not consistently push the agent toward the next CODA tool step.

**Decision:** Rewrite `next_action` strings to name the expected tools explicitly (`coda_create`, `coda_focus`, `coda_status`, `coda_read`, `coda_advance`).

**Alternatives considered:**
- Preserve generic prose and rely on tool descriptions alone — rejected because it did not correct the observed behavioral drift.
- Create a shared cross-layer string registry — rejected because Phase 56 should stay inside the existing local surfaces and avoid new layering complexity.

**Rationale:** Concrete tool names make the intended path obvious to both operators and agents.

**Impact:** Entry and lifecycle handoffs now reinforce one consistent issue-first workflow story.

## [2026-04-17] Silent entry surfaces cause build-first behavior even when tools exist
**Type:** lesson
**Phase:** 56 of 57 (Lifecycle-First Prompts)
**Related:** `docs/v0.8/E2E-COMPOUNDING-FINDINGS.md`, `packages/coda/src/pi/hooks.ts`, PR #24

**What happened:** After Phase 53 added agent-callable entry tools, the live agent still built too early and read CODA source because unfocused entry guidance remained too weak.

**What we learned:** Tool availability is not enough; the first visible prompt and every lifecycle handoff must explicitly name the next CODA action.

**How to apply:** When adding lifecycle capabilities, verify the prompt/handoff surfaces steer agents toward them immediately instead of assuming discovery will happen naturally.

#### RUBY — Technical Debt Review
- ESLint complexity scan on changed files returned no functions over the configured threshold.
- `wc -l` findings:
  - `packages/coda/src/pi/hooks.ts` — 485 lines (**WARN**, near the 500-line soft threshold). Recommendation: if lifecycle guidance grows again, extract another tiny local helper or constant block before adding more prompt text.
  - `packages/coda/src/pi/__tests__/hooks.test.ts` — 754 lines (**CRITICAL** by RUBY file-size rubric). Recommendation: split bootstrap, write-gate, and autonomous-trigger cases into dedicated suites in a follow-up refactor.
  - `packages/coda/src/tools/__tests__/coda-status.test.ts` — 407 lines (**WARN**). Recommendation: separate general phase guidance from UNIFY review cases if further growth continues.
- Outcome: technical-debt concerns are advisory only; no production-file complexity issues blocked completion.

## Accomplishments

- Added explicit CODA lifecycle bootstrap guidance for unfocused sessions instead of returning silent hook context.
- Strengthened focused phase/build prompts so the agent is told both the current job and the next CODA tool step.
- Aligned operator-facing `next_action` wording across status, focus, and forge surfaces around the same issue-first lifecycle story.

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Keep Phase 56 inside existing prompt and next_action surfaces | The bug was behavioral steering, not missing tooling or missing lifecycle states | Fixed F3/F4 without introducing a new prompt framework |
| Bootstrap unfocused sessions in `before_agent_start` | The unfocused path was too quiet and invited build-first behavior | Agents now get immediate forge/create/focus guidance before touching production code |
| Standardize next_action wording around concrete tools | Generic prose did not reinforce the intended path strongly enough | `coda_status`, `coda_focus`, and `coda_forge` now tell the same lifecycle story |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 1 | Minimal — kept the change inside guardrails |
| Scope additions | 0 | None |
| Deferred | 1 | Advisory only; no effect on shipped behavior |

**Total impact:** Essential tightening only; no scope creep outside the planned prompt/next_action surfaces.

### Auto-fixed Issues

**1. Guardrail follow-up: `hooks.ts` size**
- **Found during:** Task 1 (bootstrap guidance)
- **Issue:** The initial bootstrap helper expansion pushed `hooks.ts` above the 500-line soft RUBY threshold.
- **Fix:** Compressed `buildBootstrapContext()` back into a tighter local helper while keeping the tested wording unchanged.
- **Files:** `packages/coda/src/pi/hooks.ts`
- **Verification:** `wc -l packages/coda/src/pi/hooks.ts` → 485 lines; hooks test suite remains green.
- **Commit:** `d860ba1` (phase apply commit)

### Deferred Items

Logged for future consideration:
- README drift remains after touching user-facing lifecycle guidance; DOCS flagged it during APPLY, but README work stayed out of Phase 56 scope.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| Local ESLint CLI rejected the legacy `--no-eslintrc` flag during advisory debt review | Re-ran the check with `--no-config-lookup`, which produced a clean result for changed files |

## Next Phase Readiness

**Ready:**
- Phase 57 can now re-run Script A against stronger session-start, lifecycle, and handoff guidance.
- Entry surfaces (`coda_forge`, `coda_focus`, `coda_status`) now consistently point the agent toward the next CODA tool step.
- Focused BUILD/specify/plan/verify prompts now reinforce lifecycle intent without changing core sequencing logic.

**Concerns:**
- `README.md` drift remains unresolved.
- `docs/coda-spec-v7.md` still needs the milestone-close sweep already tracked in `STATE.md`.
- DEAN baseline remains an acknowledged `1 critical / 3 high` until dependencies are upgraded.

**Blockers:**
- None.

---
*Phase: 56-lifecycle-first-prompts, Plan: 01*
*Completed: 2026-04-17*
