# E2E Compounding Test — Findings v0.11 Re-Validation

**Date:** 2026-04-20  
**Repo branch:** `feature/60-e2e-re-validation`  
**Repo commit under test:** `5925a58` (`5925a58e6803ba3f08e2e6d99d04ec31dfcad28a`)  
**Test dir:** `~/pi/workspace/coda-test-shortener-v011`  
**Inner-agent model:** `anthropic/claude-sonnet-4-20250514`  
**Script:** `/Users/maxwellnewman/pi/workspace/thinkingSpace/explorations/cmux-v08-test-scripts.md` — Script A  
**Pi version:** `0.67.6`  
**Extension load method:** `pi --no-extensions --no-skills --no-prompt-templates --no-themes --no-context-files -e /Users/maxwellnewman/pi/workspace/coda/packages/coda/src/pi/index.ts --model 'anthropic/claude-sonnet-4-20250514'`  
**Environment deviations:** startup emitted non-blocking model-alias / package-update warnings plus a model deprecation banner, but CODA loaded in isolation and the live run proceeded without unrelated extension interference.

## Setup Metadata

| Field | Value |
|-------|-------|
| Goal | Re-run Script A against shipped v0.11 behavior and determine whether CODA now compounds in practice |
| Comparison baseline | `docs/v0.10/E2E-COMPOUNDING-FINDINGS-v2.md` |
| Comparison failure contract | `.paul/phases/57-e2e-re-validation/57-01-SUMMARY.md` (C1–C6 proof standard carried forward) |
| Workspace policy | Fresh disposable external workspace; preserve `.coda/`, source, tests, and git history for inspection |
| Non-negotiables | No manual `.coda/state.json` edits, no slash-command fallback after startup, no mid-run code patches |
| Command availability | `cmux`, `pi`, and `bun` present |
| Model comparability | Same dated model as the v0.10 baseline |

## Baseline Verification

### Repo baseline
- `bun test` before live run: **751 pass / 1 todo / 0 fail / 2287 expect / 56 files**
- Targeted confidence suite for the Phase 58–59 fixes: **151 pass / 1 todo / 0 fail / 446 expect / 10 files** (`coda-advance`, `sections`, `scaffold`, `coda-run-tests`, `verify-runner`, `phase-runner`, `unify-runner`, `unify-artifacts-e2e`, `lifecycle-e2e`, `bare-workspace-lifecycle`)
- Product-code drift before live run: **none** (`git diff --stat -- packages modules README.md docs/coda-spec-v7.md` → `NO_DRIFT`)

### External-run baseline
- Fresh workspace created: **yes** (`~/pi/workspace/coda-test-shortener-v011`)
- Bare Bun/TypeScript skeleton committed: **yes** (`4c25b75 init bare project`)
- CMUX + Pi session started cleanly: **yes** in CODA-only isolation
- Megapowers or other prompt-injecting extensions disabled: **yes** (`--no-extensions --no-skills --no-prompt-templates --no-themes --no-context-files`)

## Live Run Timeline

### T0 — APPLY start
- APPLY started from `.paul/phases/60-e2e-re-validation/60-01-PLAN.md` on `feature/60-e2e-re-validation`.
- Preflight note: working tree already had local `.paul/` / `.pi/` changes before APPLY; Phase 60 execution stayed scoped to the findings report plus normal lifecycle artifacts.
- Report scaffold created before baseline and live-run steps.
- Repo baseline tests and the exact Phase 58–59 confidence suite were green before the external run.
- External workspace baseline was created from scratch and committed before CODA startup.

### T1 — FORGE natural onboarding
- The inner agent initialized CODA naturally via `coda_forge`, created `build-url-shortener-service`, and focused it without slash commands or manual `.coda/state.json` edits.
- `.coda/state.json` moved to `focus_issue=build-url-shortener-service`, `phase=specify`, `tdd_gate=locked`.
- `coda.json` seeded `tdd_test_command` and `full_suite_command` to `bun test`, so the manual `coda_config` surgery from Phase 57 was **not** needed.
- Setup deviation: scaffolded gates were still `plan_review: human`, `build_review: auto-unless-block`, `unify_review: human` rather than Script A's `auto/auto/auto` baseline.
- Setup deviation: `.coda/reference/` remained empty immediately after FORGE; no project-specific ref docs were produced at lifecycle entry.

### T2 — SPECIFY refinement
- The Issue 1 record contained a visible `## Acceptance Criteria` section with 5 checklist bullets.
- When asked to tighten the criteria, the inner agent repeatedly failed to address the issue file correctly:
  - `coda_read` / `coda_edit_body` / `coda_update` were pointed at incorrect paths
  - generic `read` / `edit` / `write` attempts into `.coda/` were blocked by CODA's perimeter guard
- The agent verbally drafted stronger ACs but never persisted them to the issue record.

### T3 — PLAN transition failure and planner fallback
- `coda_advance` on SPECIFY → PLAN failed repeatedly with: **`Gate "specify→plan" blocked: Issue must have at least one acceptance criterion`**.
- This failure happened even though the issue file clearly had a populated `## Acceptance Criteria` body section.
- `.coda/state.json` stayed at `phase=specify`, `loop_iteration=0`, `current_task=null`.
- The inner agent recovered by creating `plan-v1.md` and task files directly under `.coda/issues/build-url-shortener-service/`, preserving planning artifacts but not lifecycle state coherence.

### T4 — Issue 1 BUILD / unofficial VERIFY / failed UNIFY
- After the PLAN gate failure, the inner agent built the URL shortener outside the official lifecycle using repeated TDD loops (`write` tests → `coda_run_tests` Red → production write → `coda_run_tests` Green).
- It produced working source and test files for short-code generation, storage, persistence, API, redirects, integration, and a server entry point.
- It also added an unnecessary external-workspace dependency entry (`@types/node`) and later bypassed the TDD gate for non-test files by writing `README.md` / `src/server.ts` through shell redirection after write-tool blocking.
- The agent ran real curl checks for Issue 1 and reported all five original ACs met.
- UNIFY never became official: the state remained `phase=specify`, and attempts to jump directly into `unify` failed.
- Instead of producing CODA compounding artifacts, the inner agent drifted into README writing and repeated non-lifecycle wrap-up attempts.

### T5 — Issue 2 carry-forward probe
- The analytics request created and focused `add-url-analytics-tracking` immediately, with no additional lifecycle-entry coaching.
- The second issue repeated the same pattern as Issue 1: failed direct `specify → build`, then fell back to TDD-driven source/test creation outside the official lifecycle.
- Concrete carry-forward was visible in the implementation shape:
  - reused file/test organization
  - reused server/storage/persistence decomposition
  - reused test-first cadence and `coda_run_tests` loops
  - reused analytics-enhanced sibling types (`*WithAnalytics`) rather than inventing a different architecture
- That reuse is **not creditable to CODA compounding artifacts**:
  - `.coda/reference/` stayed empty throughout
  - `.coda/modules/` never existed
  - no completion record was written
  - the issue never advanced beyond `phase=specify`
- During Issue 2 runtime debugging, the inner agent misdiagnosed a redirect/runtime bug that was later contradicted by an independent outer-agent functional rerun.

## Results Summary

| Phase | Issue 1 | Issue 2 | Notes |
|-------|---------|---------|-------|
| FORGE | ⚠️ Partial | N/A | Entry succeeded naturally, but gate config deviated and `.coda/reference/` stayed empty |
| SPECIFY | ⚠️ Partial | ⚠️ Partial | Issue records were created/focused, but refinement could not be persisted cleanly through CODA tools |
| PLAN | ❌ Fail | ❌ Skipped | `coda_advance` never moved either issue out of `specify`; planning fell back to direct artifact creation |
| BUILD | ⚠️ Partial | ⚠️ Partial | Real code and tests were produced for both issues, but outside the official lifecycle |
| VERIFY | ⚠️ Unofficial | ⚠️ Unofficial | The inner agent ran real tests/curls, but the official VERIFY phase was never reached |
| UNIFY | ❌ Fail | ❌ Not reached | No overlays, no ref-system update, no completion record, no `done` transition |
| FUNCTIONAL | ✅ Pass | ✅ Pass | Independent outer-agent rerun validated shorten / redirect / stats / persistence on the final workspace |

## Critical Findings

### C1: SPECIFY → PLAN is still broken in live use
`coda_advance` still cannot move the live issue into `plan`. The shipped v0.11 code now fails with a different reachable-path symptom than Phase 57: instead of crashing, it blocks with `Issue must have at least one acceptance criterion` even though the issue body already contains a populated acceptance-criteria section.

### C2: Planner fallback still generates artifacts without moving lifecycle state
After the PLAN gate failed, the inner agent created `plan-v1.md` plus task files directly under the issue folder. This preserved useful planning output but bypassed the phase machine the milestone is supposed to validate.

### C3: TDD gate usability improved materially
Unlike Phase 57, the external workspace seeded `tdd_test_command` / `full_suite_command` to `bun test` automatically. The inner agent used `coda_run_tests` productively without manual `coda_config` repair.

### C4: Official VERIFY remains unproven even though independent runtime checks now pass
The live run never entered the real VERIFY phase because the lifecycle never progressed beyond `specify`. The inner agent did run real tests and curls, and the outer agent independently confirmed the final runtime behavior, so the specific Phase 57 failure mode of “claimed success after a failed live check” was not reproduced. But the shipped VERIFY gate/path still was not exercised honestly end-to-end.

### C5: UNIFY still does not produce the full compounding artifact set
Across both issues, `.coda/reference/` remained empty, `.coda/modules/` never existed, no completion record was written, and `.coda/state.json` never advanced to `done`. The compounding loop is still structurally incomplete.

### C6: Issue 2 improvements are still not attributable to CODA-mediated compounding
Issue 2 clearly benefited from same-session context and reused implementation patterns, but no overlay, ref-system, or completion artifact existed on disk to mediate that carry-forward. The best explanation remains in-session memory plus freshly created source/tests, not durable CODA compounding.

## Compounding Evidence

### Overlay Quality
- Status: **failed**
- `.coda/modules/` never appeared.
- No overlay existed to seed module prompt carry-forward.

### Cross-Issue Improvement
- Status: **observed, but weakly attributable**
- Issue 2 started faster than Issue 1: the inner agent created/focused the analytics issue immediately and reused the same storage/server/test decomposition.
- Reuse evidence: `urlMappingStorageWithAnalytics.ts`, `urlPersistenceManagerWithAnalytics.ts`, `shortenApiServerWithAnalytics.ts`, plus matching analytics test files.
- This is implementation-pattern reuse, not proof of CODA artifact-mediated compounding.

### Knowledge Carry-Forward
- Status: **not proven CODA-mediated**
- `.coda/reference/` stayed empty from FORGE through the stop point.
- No overlays or completion artifacts existed on disk before or during Issue 2.
- Same-session conversational memory remains the most defensible explanation for the smoother second issue.

## Prompt Effectiveness

- Lifecycle entry without slash-command coaching: **good** — FORGE / issue creation / focus worked naturally.
- Need to read CODA source to understand the workflow: **not observed** — the agent relied on tool responses and workspace inspection instead.
- Quality of lifecycle guidance after entry: **still weak** — the agent did not recover from the false acceptance-criteria gate failure and repeatedly fell back to direct artifact creation.
- Write-gate / TDD-gate behavior: **mixed** — `.coda/` perimeter blocking worked during SPECIFY, but the agent later bypassed non-test write restrictions for `README.md` / `src/server.ts` via shell redirection.

## Agent Experience Observations

- Naturalness of the interaction: strong during coding and test generation; weak during phase control and wrap-up.
- Main friction points:
  - false `specify→plan` block on visible ACs
  - path confusion when trying to update issue records
  - repeated non-lifecycle workarounds once phase advancement failed
  - UNIFY collapsing into README writing rather than CODA artifacts
  - Issue 2 runtime-debugging confusion that contradicted independent reruns
- A real developer would see useful code output, but still would not trust CODA's lifecycle completion or compounding evidence.

## Issues Found

| # | Finding | Severity | Category | Status |
|---|---------|----------|----------|--------|
| C1 | `coda_advance` still cannot advance live SPECIFY → PLAN; now blocks with a false “must have at least one acceptance criterion” gate reason | Critical | Lifecycle | Active |
| C2 | Planner fallback still creates plan/task artifacts without moving lifecycle state | High | Lifecycle / planning | Active |
| C3 | TDD defaults are now usable without manual `coda_config` intervention | Info | TDD workflow | Resolved in v0.11 |
| C4 | Honest runtime verification exists, but official VERIFY phase remains unproven because the lifecycle never leaves `specify` | Medium | Verification path | Active |
| C5 | UNIFY still produces no overlays, no ref docs, no completion record, and no `done` transition | Critical | Compounding engine | Active |
| C6 | Issue 2 improvement is still attributable to same-session memory, not CODA artifact-mediated carry-forward | High | Compounding evidence | Active |

## Artifacts

### `.coda/` files
- `coda.json` — scaffolded successfully; `tdd_test_command` / `full_suite_command` both seeded to `bun test`
- `state.json` — ended focused on `add-url-analytics-tracking`, still `phase=specify`, `loop_iteration=0`
- `issues/build-url-shortener-service.md` — Issue 1 record with original AC bullets
- `issues/build-url-shortener-service/plan-v1.md` and task files — planner fallback artifacts created after the failed PLAN gate
- `issues/add-url-analytics-tracking.md` — Issue 2 record created/focused immediately
- `.coda/reference/` — **empty**
- `.coda/modules/` — **absent**
- completion records — **absent**

### Source files
- Issue 1 core: `shortCodeGenerator.ts`, `urlMappingStorage.ts`, `urlPersistenceManager.ts`, `shortenApiServer.ts`, `server.ts`
- Issue 2 extension: `urlMappingStorageWithAnalytics.ts`, `urlPersistenceManagerWithAnalytics.ts`, `shortenApiServerWithAnalytics.ts`

### Test files
- Issue 1 core: `shortCodeGenerator.test.ts`, `urlMappingStorage.test.ts`, `jsonPersistence.test.ts`, `shortenApi.test.ts`, `redirectService.test.ts`, `integration.test.ts`
- Issue 2 extension: `urlAnalytics.test.ts`, `analyticsApi.test.ts`, `analyticsPersistence.test.ts`, `analyticsIntegration.test.ts`
- Final external suite state: **60 pass / 0 fail / 157 expect / 10 files**

### Git history
- `4c25b75` — initial bare project commit
- No task-level commits were created during either issue; the working tree remained uncommitted and preserved for inspection

## Functional Verification

Independent outer-agent rerun on the final external workspace:

- `POST /shorten` — **pass**
  - Response: `{"shortCode":"c81na6","url":"https://phase60.example.com/resource?x=1"}`
- `GET /:code` redirect — **pass**
  - Response: `HTTP/1.1 302 Found`
  - `Location: https://phase60.example.com/resource?x=1`
- `GET /stats/:code` — **pass**
  - First check: `{"url":"https://phase60.example.com/resource?x=1","visitCount":1,"lastVisited":"2026-04-20T12:53:03.429Z"}`
- Persistence across restart — **pass**
  - After restarting the server, `GET /:code` still returned `302 Found`
  - `GET /stats/:code` then returned `visitCount":2`, proving persisted analytics state survived restart

## Comparison vs Phase 57 Findings

| Phase 57 Finding | v0.11 Re-Validation Result | Evidence |
|------------------|----------------------------|----------|
| C1: SPECIFY → PLAN transition broken in live use | **still broken** | `coda_advance` no longer crashes, but still blocks live progression with the false gate reason `Issue must have at least one acceptance criterion` while the issue body clearly contains ACs |
| C2: Planner fallback generated artifacts without moving lifecycle state | **still broken** | `plan-v1.md` and task records were created directly while `state.json` stayed in `phase=specify` |
| C3: TDD gate required manual test-command configuration | **resolved** | `coda.json` seeded both test commands to `bun test`; the inner agent used `coda_run_tests` without manual `coda_config` repair |
| C4: VERIFY over-claimed success after failed live functional check | **improved, but official path unproven** | The specific false-success behavior was not reproduced; independent runtime checks passed, but the real VERIFY phase never ran because the lifecycle never left `specify` |
| C5: UNIFY failed to produce overlays / completion / done transition | **still broken** | `.coda/reference/` stayed empty, `.coda/modules/` never existed, no completion record was written, and state never advanced to `done` |
| C6: Issue 2 improvement was not attributable to CODA-mediated compounding | **still broken** | Issue 2 reused patterns, but no overlay/ref-system/completion artifacts existed to mediate that reuse |

## Milestone Verdict

**Status:** complete — milestone failure documented  
**Binary verdict:** still broken

### Exit criteria checklist
- [x] Lifecycle entry succeeded without manual state hacks
- [ ] Issue 1 produced real overlays and ref-system updates on disk
- [ ] Issue 2 showed measurable CODA-mediated carry-forward
- [x] Functional checks passed in the external workspace
- [x] No shipped CODA code was patched during the run

### Decision note
v0.11 materially improved the external-run coding experience: lifecycle entry works, test commands seed correctly, and the final workspace now passes independent shorten / redirect / stats / persistence checks. But the milestone claim is still not valid. The official phase machine still cannot advance past SPECIFY, Issue 1 and Issue 2 both bypass planning/build/unify through direct artifact creation, and UNIFY still produces none of the durable compounding artifacts that the milestone requires. The correct binary decision remains **still broken**.
