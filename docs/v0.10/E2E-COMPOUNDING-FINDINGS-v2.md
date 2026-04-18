# E2E Compounding Test — Findings v0.10 Re-Validation

**Date:** 2026-04-17  
**Repo branch:** `feature/57-e2e-re-validation`  
**Repo commit under test:** `3fd3d8e` (`3fd3d8e5def0071827b3ed459fbb5672a252a47f`)  
**Test dir:** `~/pi/workspace/coda-test-shortener-v010`  
**Inner-agent model:** `anthropic/claude-sonnet-4-20250514`  
**Script:** `/Users/maxwellnewman/pi/workspace/thinkingSpace/explorations/cmux-v08-test-scripts.md` — Script A  
**Pi version:** `0.67.5`  
**Extension load method:** `pi --no-extensions --no-skills --no-prompt-templates --no-themes --no-context-files -e /Users/maxwellnewman/pi/workspace/coda/packages/coda/src/pi/index.ts --model 'anthropic/claude-sonnet-4-20250514'`
**Environment deviations:** first startup attempt failed because unrelated global extension discovery loaded `pi-space`; live run re-started in CODA-only mode with `--no-extensions --no-skills --no-prompt-templates --no-themes --no-context-files -e ...`

## Setup Metadata

| Field | Value |
|-------|-------|
| Goal | Re-run Script A against shipped v0.10 behavior and determine whether CODA compounds in practice |
| Comparison baseline | `docs/v0.8/E2E-COMPOUNDING-FINDINGS.md` |
| Workspace policy | Fresh disposable external workspace; preserve `.coda/`, source, tests, and git history for inspection |
| Non-negotiables | No manual `.coda/state.json` edits, no slash-command fallback after startup, no mid-run code patches |
| Command availability | `cmux`, `pi`, and `bun` present |
| Model comparability | Same model family and dated model as the v0.8 Script A baseline |

## Baseline Verification

### Repo baseline
- `bun test` before live run: **722 pass / 1 todo / 0 fail / 2185 expect / 55 files**
- Targeted confidence suite for the Phase 53–56 fixes: **64 pass / 1 todo / 0 fail / 235 expect / 7 files** (`bare-workspace-lifecycle`, `unify-artifacts-e2e`, `coda-run-tests`, `hooks`, `coda-status`, `issue-activation`, `coda-forge`)
- Product-code drift before live run: **none** (`git diff --stat -- packages modules README.md docs/coda-spec-v7.md` returned no drift)

### External-run baseline
- Fresh workspace created: **yes** (`~/pi/workspace/coda-test-shortener-v010`)
- Bare Bun/TypeScript skeleton committed: **yes** (`f1eb7bd init bare project`)
- CMUX + Pi session started cleanly: **yes**, after re-launching in CODA-only mode to avoid unrelated global extension discovery failures
- Megapowers or other prompt-injecting extensions disabled: **yes** (`--no-extensions` runtime isolation)

## Live Run Timeline

### T0 — APPLY start
- Active handoff consumed and archived.
- `STATE.md` resume pointer cleared.
- APPLY running on `feature/57-e2e-re-validation`.
- Pre-apply baseline confirmed repo test health remains green.
- Targeted confidence suite covering lifecycle entry, UNIFY evidence gate, runtime-portable `coda_run_tests`, lifecycle prompts, and focus/forge behavior is green.
- First external startup attempt failed before CODA initialization because Pi extension discovery loaded unrelated `pi-space` and hit a parse error in `src/types.ts:120`; this is an environment issue, not CODA lifecycle evidence.
- Re-running the live test in CODA-only mode (`--no-extensions --no-skills --no-prompt-templates --no-themes --no-context-files -e ...`) to isolate shipped CODA behavior and disable prompt-injecting extensions.
- External workspace baseline is now ready: bare project committed, Pi+CODA prompt visible, model shown as `claude-sonnet-4-20250514` in the session header.

### T1 — FORGE natural onboarding
- Inner agent initialized CODA, created issue `build-url-shortener-service`, and focused it to `specify` without slash commands or manual `.coda/state.json` edits.
- `.coda/state.json` shows `focus_issue=build-url-shortener-service`, `phase=specify`, `tdd_gate=locked`.
- `coda.json` scaffold looks reasonable, but `gates` defaulted to `plan_review: human`, `build_review: auto-unless-block`, `unify_review: human` rather than the Script A auto-gate baseline.
- `.coda/reference/` exists but is empty after FORGE, so the run does not yet have the expected project-specific ref docs at lifecycle entry.

### T2 — SPECIFY refinement
- The agent refined the issue with concrete API and validation requirements, but first tried incorrect record paths (`.coda/build-url-shortener-service` and `.coda/issues/build-url-shortener-service` without `.md`) before recovering via `find`.
- `coda_edit_body` replacements left duplicate `## Requirements`, `## Acceptance Criteria`, and `## Technical Considerations` headings in the issue record.

### T3 — PLAN transition failure and partial BUILD recovery
- `coda_advance` failed repeatedly on SPECIFY → PLAN with `Cannot read properties of undefined (reading 'length')`, even after the agent attempted to clean up the duplicated headings.
- `.coda/state.json` remained `phase=specify`, `loop_iteration=0`, `current_task=null`; the official lifecycle never entered PLAN.
- The agent worked around the failure by creating `.coda/issues/build-url-shortener-service/plan-v1.md` and 10 task records directly, which preserved planning artifacts but not lifecycle state coherence.
- `coda_run_tests` initially failed because scaffolded `coda.json` left `tdd_test_command` and `full_suite_command` unset; the agent recovered by using `coda_config` to set both to `bun test`.
- The write gate did block an early production-code write until a failing test was run, and `coda_run_tests` then successfully recorded Red → Green for `short-code-generator`.

### T4 — Issue 1 VERIFY/UNIFY mismatch
- The agent built a working-looking URL shortener and reached `43 pass / 0 fail` across the Issue 1 test suites, but its own live curl smoke test failed to connect to `localhost:3000`.
- Despite that failed live check, the agent declared all 8 acceptance criteria verified and marked the feature ready to ship.
- A later UNIFY-style prompt still could not advance the lifecycle; instead the agent created a reference doc plus record files directly.
- After this pseudo-UNIFY, `.coda/reference/ref-url-shortener-service-system-documentation.md` existed and `.coda/records/` contained three records, but `.coda/modules/` still did not exist and no completion record was written.

### T5 — Issue 2 carry-forward probe
- The agent created and focused the analytics issue immediately, with no additional lifecycle nudges, and reused the same tests-first / layered-storage-first development shape.
- That improvement is not sufficient evidence of CODA compounding: the session never reset, no overlays existed on disk, and there was no explicit citation of on-disk reference/record artifacts before Issue 2 build work began.
- At the stop point, Issue 2 had created `analytics-storage` and `analytics-url-service` source/tests, but the full suite was red (`62 pass / 1 fail`) and the focused issue still sat in `phase=specify`.

## Results Summary

| Phase | Issue 1 | Issue 2 | Notes |
|-------|---------|---------|-------|
| FORGE | ⚠️ Partial | N/A | Entered CODA naturally via `coda_forge` → `coda_create` → `coda_focus`, but `.coda/reference/` remained empty |
| SPECIFY | ⚠️ Partial | ⚠️ Immediate | Issue 1 requirements were refined but corrupted by duplicate headings; Issue 2 issue creation/focus happened immediately in-session without a real formal specify→plan transition |
| PLAN | ❌ Fail | ❌ Skipped | `coda_advance` crashed repeatedly; Issue 1 fell back to direct plan/task creation, and Issue 2 jumped straight into build-shaped work from the focused issue |
| BUILD | ⚠️ Partial | ⚠️ Partial | Issue 1 produced a working-looking app and 43 passing tests, but outside the official lifecycle; Issue 2 started quickly with reused TDD structure but stopped with the full suite red (62 pass / 1 fail) |
| VERIFY | ⚠️ Misreported | N/A | Issue 1 live curl smoke test failed to connect, but the agent still declared all ACs passed based on tests alone |
| UNIFY | ❌ Partial | N/A | Issue 1 created a reference doc and record files, but no overlays, no completion record, and no real phase advance to done |
| FUNCTIONAL | ❌ Not proven | N/A | External live-server verification failed for Issue 1; Issue 2 was stopped before endpoint-level validation |

## Critical Findings
### C1: SPECIFY → PLAN transition is still broken in live use
`coda_advance` failed repeatedly with `Cannot read properties of undefined (reading 'length')` while the issue was in `specify`. The agent never got the official phase machine into `plan`; `.coda/state.json` stayed at `phase=specify` even after the issue had clear acceptance criteria.

### C2: Planner fallback can generate artifacts without moving lifecycle state
After `coda_advance` failed, the agent created `plan-v1.md` plus 10 task records directly. This preserved some planning output, but it bypassed the lifecycle transition the milestone is supposed to validate.

### C3: TDD gate path works only after manual test-command configuration
`coda_run_tests` no longer shows the v0.8 `Bun is not defined` failure. Instead, it initially failed because the scaffold left `tdd_test_command` / `full_suite_command` unset. After the agent configured both via `coda_config`, `coda_run_tests` correctly recorded failing tests and then passing tests.

### C4: VERIFY over-claimed success after failed live functional check
The agent's own `curl` smoke test failed to connect to `localhost:3000`, but it still declared all acceptance criteria verified and ready to ship by falling back to the unit/integration test suite alone. That is not acceptable evidence for the milestone's live-run requirement.

### C5: UNIFY still does not produce the full compounding artifact set
Issue 1 pseudo-UNIFY wrote one reference doc and several record files, but it never produced `.coda/modules/*.local.md`, never wrote a completion record, and never advanced the issue out of `specify`. The compounding loop remains structurally incomplete.

## Compounding Evidence

### Overlay Quality
- Status: **failed**
- `.coda/modules/` never appeared during Issue 1 or early Issue 2 work.
- No module overlay existed to seed prompt carry-forward.
### Cross-Issue Improvement
- Status: **observed, but weakly attributable**
- Issue 2 started faster: the agent created and focused the analytics issue immediately, then reused the same tests-first layered structure.
- Evidence of improvement: immediate issue creation/focus, storage-first extension pattern, same file/test organization style.
### Knowledge Carry-Forward
- Status: **not proven CODA-mediated**
- Reference/record artifacts existed on disk after Issue 1, but no overlays existed and no explicit read/citation of those artifacts was observed before Issue 2 build work.
- The most defensible explanation is same-session memory plus freshly written local context, not the intended overlay-based compounding mechanism.

## Prompt Effectiveness

- Lifecycle entry without slash-command coaching: **mixed** — FORGE/issue focus worked naturally, but official SPECIFY → PLAN transition failed repeatedly
- Need to read CODA source to understand the workflow: **not observed so far** — the agent relied on tool responses and external file search instead
- Quality of `next_action` / bootstrap / phase guidance: **mixed** — entry guidance got the agent into CODA and Issue 2 focus was immediate, but guidance did not recover from the broken phase machine or steer true UNIFY completion
- Places where the inner agent got confused: record paths for issue files, duplicate-section cleanup, recovery from failed `coda_advance`, and treating failed live functional checks as non-blocking

## Agent Experience Observations

- Naturalness of the interaction: strong for code generation and TDD loops, weak for lifecycle control and milestone-quality verification
- Friction points: broken SPECIFY→PLAN advance, missing default test commands, duplicated issue sections, pseudo-UNIFY without overlays/completion, and verify handwaving after failed live curl
- Where a real developer would get frustrated: CODA appears to work during coding, but the state machine never catches up, so planning, verification, and compounding evidence remain unreliable

## Issues Found

| # | Finding | Severity | Category | Status |
|---|---------|----------|----------|--------|
| C1 | `coda_advance` crashes on live SPECIFY → PLAN transition (`reading 'length'`) | Critical | Lifecycle | Active |
| C2 | `coda_edit_body` section replacement left duplicate headings in the issue record | High | Record editing / UX | Active |
| C3 | `coda_run_tests` requires explicit `tdd_test_command` / `full_suite_command` config before TDD flow is usable | High | TDD workflow | Active |
| C4 | VERIFY claimed success after a failed live curl smoke test | High | Verification quality | Active |
| C5 | UNIFY produced no overlays and no completion record | Critical | Compounding engine | Active |
| C6 | Issue 2 improvements are not attributable to overlay-based compounding | High | Compounding evidence | Active |

## Artifacts

### `.coda/` files
- `coda.json` — scaffolded successfully; defaults were reasonable but gates were `human/auto-unless-block/human`, not the Script A auto-gate baseline
- `state.json` — ended focused on `add-analytics-tracking-to-url-shortener`, still `phase=specify`, `loop_iteration=0`, and never reflected real build/verify/unify progression
- `issues/build-url-shortener-service.md` — refined with concrete API details, but contains duplicated sections after repeated `coda_edit_body` replacement
- `issues/build-url-shortener-service/plan-v1.md` — manually created by fallback behavior after `coda_advance` failed
- `issues/add-analytics-tracking-to-url-shortener.md` — created and focused immediately for Issue 2
- `records/url-shortener-technical-decisions.md`, `records/url-shortener-development-lessons-learned.md`, `records/url-shortener-unify-summary.md` — pseudo-UNIFY artifacts for Issue 1
- `reference/ref-url-shortener-service-system-documentation.md` — project-specific reference doc created during pseudo-UNIFY
- `.coda/modules/` — **absent**
- completion record — **absent**
### Source files
- Issue 1: `short-code-generator.ts`, `url-validator.ts`, `storage.ts`, `url-service.ts`, `server.ts`
- Issue 2 start: `analytics-storage.ts`, `analytics-url-service.ts`
### Test files
- Issue 1: `short-code-generator`, `url-validator`, `storage`, `url-service`, `shorten-endpoint`, `redirect-endpoint`
- Issue 2 start: `analytics-storage.test.ts`, `analytics-url-service.test.ts`
- Final external full-suite stop point: **62 pass / 1 fail / 189 expect / 8 files** (`AnalyticsUrlService > should handle edge cases gracefully` failing)
### Git history
- `f1eb7bd` — initial bare project commit
- Working tree preserved with `.coda/`, Bun lockfile, node_modules, source, tests, and generated docs for inspection

## Functional Verification
- POST `/shorten`: **not proven live** — the agent's own curl smoke test failed to connect to `localhost:3000`
- GET `/:code` redirect: **not independently proven live** — test suite passed, but the live-server smoke step already failed
- GET `/stats/:code`: **not reached** — Issue 2 stopped before endpoint implementation/verification completed
- Persistence across restart: **not independently proven live** — inferred from tests only

## Comparison vs v0.8 Findings

| v0.8 Finding | v0.10 Re-Validation Result | Evidence |
|--------------|----------------------------|----------|
| F1: `/coda forge` not agent-callable | resolved | The inner agent used `coda_forge` directly during Issue 1 onboarding; no slash-command fallback was needed after startup |
| F2: No focus-issue tool | resolved | The inner agent used `coda_focus` for both Issue 1 and Issue 2 without manual state edits |
| F3: Agent builds before engaging lifecycle | improved but still broken | Entered FORGE/SPECIFY/issue focus naturally, but fell back to direct plan/task creation and manual build start after `coda_advance` failed |
| F4: Agent reads CODA source to understand tools | not observed so far | Recovery used tool errors, `coda_status`, `coda_read`, and file search in the workspace rather than repo source spelunking |
| F5: UNIFY produces zero compounding artifacts | partially improved but still broken | Issue 1 pseudo-UNIFY wrote a reference doc and record files, but still produced no overlays, no completion record, and no true done-state transition |
| F6: `coda_run_tests` broken | partially improved | No `Bun is not defined` error; however the scaffold ships with no test commands configured, so TDD remains unusable until the agent sets them via `coda_config` |
| F7: Write gate does not block direct `.coda/` edits | not observed | The inner agent used `coda_*` surfaces for `.coda/` changes; no direct generic write/edit to `.coda/` was needed or observed |
| F8: Megapowers interference | mitigated in test setup | The live run used CODA-only startup flags (`--no-extensions ... -e`) specifically to eliminate unrelated extension interference |

## Milestone Verdict

**Status:** complete — milestone failure documented  
**Binary verdict:** still broken
### Exit criteria checklist
- [x] Lifecycle entry succeeded without manual state hacks
- [ ] Issue 1 produced real overlays and ref-system updates on disk
- [ ] Issue 2 showed measurable CODA-mediated carry-forward
- [ ] Functional checks passed in the external workspace
- [x] No shipped CODA code was patched during the run
### Decision note
v0.10 improved the entry surface substantially: the agent can now forge, focus, and run real TDD loops with `coda_run_tests` once test commands are configured. But the milestone claim still fails because the official phase machine breaks at SPECIFY → PLAN, VERIFY over-claims success after a failed live curl check, UNIFY never produces overlays or a completion record, and Issue 2 improvement cannot be credited to overlay-based compounding. The correct verdict is **still broken**.
