# Milestones

Completed milestone log for this project.

| Milestone | Completed | Duration | Stats |
|-----------|-----------|----------|-------|
| v0.1 Initial Release | 2026-03-29 | ~12 hours | 8 phases, 9 plans, 63 files |
| v0.2 Autonomous Loops | 2026-04-01 | 4 days | 9 phases, 10 plans, 255 tests |
| v0.3 Module System | 2026-03-29 | ~2 days | 8 phases, 8 plans, 33 files |
| v0.4 Live Validation | 2026-03-29 | ~3 hours | 3 phases, 3 plans, 21 files |
| v0.5 Module Completion | 2026-04-03 | ~1.5 hours | 3 phases, 3 plans, 433 tests |
| v0.6 VCS & Workflow Gaps | 2026-04-03 | ~1.5 hours | 4 phases, 4 plans, 460 tests |
| v0.7 Brownfield & Context | 2026-04-03 | ~6 hours | 11 phases, 11 plans, 573 tests |
| v0.8 The Compounding Engine | 2026-04-15 | 2 days | 5 phases, 5 plans, 655 tests |
| v0.9 Live Compounding Validation | 2026-04-16 | 1 day | 1 phase, 1 plan, 8 findings (3 critical, 4 high, 1 medium) |
| v0.10 Close the Agent Loop | 2026-04-17 | ~1 day | 5 phases, 5 plans, closed as documented failure |

---

## ⚠️ v0.10 Close the Agent Loop

**Completed:** 2026-04-17
**Version:** v0.10.0
**Duration:** ~1 day (2026-04-16 to 2026-04-17)
**Outcome:** Closed as documented failure after Phase 57 live re-validation

### Stats

| Metric | Value |
|--------|-------|
| Phases | 5 shipped (53–57) |
| Plans | 5 |
| Tests | 722 passing / 1 todo |
| New tools | 12 total (`coda_forge`, `coda_focus` added in Phase 53) |
| Key docs | `docs/v0.10/E2E-COMPOUNDING-FINDINGS-v2.md` |
| Milestone verdict | `still broken` |

### Key Accomplishments

- Landed agent-callable lifecycle entry via `coda_forge` and `coda_focus`, plus real Pi-dispatch write-gate regression coverage.
- Made `unify→done` evidence-based: `artifacts_produced` + exemptions schema, disk-backed artifact verification, and ceremony-aware enforcement.
- Repaired supporting systems around live use: runtime-portable `coda_run_tests`, deeper write-gate hardening, and legacy `human_review_default` migration into `gates`.
- Strengthened session-start and phase-local prompts so unfocused agents are steered into forge/create/focus and tool-first lifecycle behavior.
- Re-ran Script A against shipped v0.10 behavior and produced an authoritative findings report that refused to credit same-session memory or pseudo-UNIFY output as compounding.

### Key Decisions

- `coda_focus` keeps VCS branch creation by default with `create_branch: false` as the escape hatch.
- `unify→done` evidence uses a hybrid model: agent-declared `artifacts_produced` plus gate-side disk verification.
- Custom mutation tools default-deny on `.coda/` references unless they are explicit `coda_*` tools.
- Lifecycle guidance stayed inside existing prompt surfaces rather than adding a new prompt framework.
- v0.10 was closed as a documented failure once Phase 57 proved live SPECIFY → PLAN advancement, VERIFY truthfulness, and UNIFY artifact completion still did not hold end-to-end.

### Conclusion

v0.10 improved lifecycle entry and guardrails, but it did not meet its success definition. The compounding engine still failed in live use because the real lifecycle stalled before compounding could be demonstrated. The next milestone must fix live phase advancement, explicit verification evidence, and end-to-end UNIFY artifact production before another re-validation.

### Archive

- Roadmap snapshot: `.paul/milestones/v0.10.0-ROADMAP.md`
- Findings report: `docs/v0.10/E2E-COMPOUNDING-FINDINGS-v2.md`
- Phase 57 summary: `.paul/phases/57-e2e-re-validation/57-01-SUMMARY.md`

---

## ✅ v0.9 Live Compounding Validation

**Completed:** 2026-04-16
**Version:** v0.9.0
**Duration:** 1 day (2026-04-15 to 2026-04-16)
**Scope:** Scoped down — Phase 53 (Brownfield Onboarding Test) deferred to v0.11+

### Stats

| Metric | Value |
|--------|-------|
| Phases | 1 shipped (52), 1 deferred (53) |
| Plans | 1 |
| Tests | 655 passing (no change — validation-only milestone) |
| New docs | `docs/v0.8/E2E-COMPOUNDING-FINDINGS.md` |
| Sessions | 3 CMUX E2E sessions with GPT-5.4 |
| Findings | 8 total (3 critical, 4 high, 1 medium) |

### Key Accomplishments

- Executed Script A E2E test across 3 CMUX sessions with GPT-5.4 inner agent
- Confirmed corrected execution model: outer agent runs `/coda forge` + gate config, inner agent uses `coda_*` tools
- Produced comprehensive 8-finding report with severity classifications and recommended fixes
- Validated that GPT-5.4 builds high-quality functional code (7 tests, 19 assertions, clean TypeScript)
- Identified 3 critical architecture gaps blocking autonomous compounding (forge tool, focus tool, UNIFY overlay generation)

### Critical Findings (drove v0.10 milestone scope)

| # | Finding | Severity |
|---|---------|----------|
| F1 | `/coda forge` not agent-callable | Critical |
| F2 | No "focus issue" tool | Critical |
| F5 | UNIFY produces zero overlays/reference docs | Critical |
| F3 | Agent builds before CODA lifecycle | High |
| F4 | Agent reads CODA source to understand tools | High |
| F6 | `coda_run_tests` "Bun is not defined" | High |
| F7 | Write gate doesn't block `.coda/` edits | High |
| F8 | megapowers interference | Medium |

### Key Decisions

- Outer agent must run `/coda forge` (slash command) — inner agent cannot (architectural limitation)
- 3-nudge bail-out policy enforced — document failure and proceed
- Gates set to auto via direct file edit (outer agent, not inner)
- Phase 53 (Brownfield) deferred — would hit same F1/F2/F5 blockers; revisit after v0.10 fixes

### Conclusion

The compounding engine does not compound in practice. While infrastructure exists (overlay format, prompt assembly, UNIFY runner), the end-to-end flow is broken at multiple points: entry gap (no agent tools), lifecycle gap (agent builds first), UNIFY gap (no overlays produced), compounding gap (nothing to inject).

This milestone's findings directly drive the **v0.10 Close the Agent Loop** milestone.

### Archive

- Roadmap snapshot: `.paul/milestones/v0.9.0-ROADMAP.md`
- Findings report: `docs/v0.8/E2E-COMPOUNDING-FINDINGS.md`
- Phase 52 summary: `.paul/phases/52-greenfield-compounding-test/52-01-SUMMARY.md`

---
## ✅ v0.8 The Compounding Engine

**Completed:** 2026-04-15
**Version:** v0.8.0
**Duration:** 2 days (2026-04-14 to 2026-04-15)

### Stats

| Metric | Value |
|--------|-------|
| Phases | 5 |
| Plans | 5 |
| Tests | 655 passing (197 core + 458 coda) |
| New source files | 7 (2 production + 5 test) |
| Lines added | +2,963 / −68 |
| TypeScript | `tsc --noEmit` clean |
| External deps in core | 0 |

### Key Accomplishments

- Built the UNIFY Runner Core (Phase 47): structured 5-action UNIFY prompt, expanded `unify→done` gate with completion-record-backed data, shared `findCompletionRecordPath()` helper.
- Added UNIFY Review Gate (Phase 48): human approval mechanism for autonomous UNIFY output, `unify_review_status` on completion record, revision-aware UNIFY context that incorporates prior feedback.
- Shipped Module Overlay Infrastructure (Phase 49): two-layer prompt model (default + `.coda/modules/*.local.md`), overlay-aware dispatcher, UNIFY ACTION 3b compounding instruction, FORGE overlay seeding.
- Implemented Gate Automation (Phase 50): configurable gate modes (`human`/`auto`/`auto-unless-block`) for 3 lifecycle transitions (`plan_review`, `build_review`, `unify_review`), per-issue-type overrides, full backward compat with `human_review_default`.
- Validated cross-feature composition (Phase 51): 11 E2E tests proving overlays + gate automation + review gate compose correctly; `/coda new`, review-runner, and coda-status aligned with gate config.
- Quality trajectory: 589 → 655 tests (+66), zero regressions, TypeScript strict clean throughout.

### Key Decisions

- D1: Gate-mediated UNIFY approval (not inline) — keeps UNIFY autonomous; human validates via separate review step.
- D2: Diff presentation via conversation channel — no special TUI widget needed for v0.8.
- D3: Overlay write via `coda_edit_body` — reuses existing mutation path; `coda_feedback` deferred to v0.9.
- D4: Gate automation replaces `human_review_default` — unified gate config with backward compat.
- D5: Aggregate UNIFY review gate (not per-action) — v0.8 uses post-UNIFY review; per-action deferred.
- D6: Shared `findCompletionRecordPath()` helper — 3 call sites share completion record lookup.
- D7: Completion record carries `unify_review_status` — disk-based signal for revision detection.
- D8: 3-gate-point scope (not 5 from spec) — `specify_approval`/`spec_delta` deferred.

---

## ✅ v0.7 Brownfield & Context

**Completed:** 2026-04-03
**Version:** v0.7.0
**Duration:** ~6 hours

### Stats

| Metric | Value |
|--------|-------|
| Phases | 11 |
| Plans | 11 |
| Tests | 573 passing |
| TypeScript | `tsc --noEmit` clean |

### Key Accomplishments

- Topic-based section retrieval (`getSectionsByTopics` + `getSectionHeadings`) in core data layer.
- Dependency-based carry-forward with 3 selection paths (dependency/correction/recency).
- Adaptive ceremony rules for 5 issue types with config overrides.
- Context budget management with `assembleWithinBudget`, advisory budgets, no mid-section truncation.
- 5 modules gained init-scan hooks with brownfield detection and evidence file I/O.
- Full brownfield FORGE pipeline: SCAN → SYNTHESIZE → GAP ANALYSIS → VALIDATE → ORIENT.
- Wired brownfield into `/coda forge` with `detectBackdrop` routing.
- 4 E2E tests covering full brownfield pipeline.

### Key Decisions

- Overview always-include uses exact heading match (case-insensitive) for topic retrieval.
- `context-budgets.ts` separated from `context-builder.ts` to keep files under 500 lines.
- Synthetic `HookContext` for forge: `issueSlug='forge-onboarding'`, `phase='forge'` — dispatcher doesn't validate against state.

---

## ✅ v0.6 VCS & Workflow Gaps

**Completed:** 2026-04-03
**Version:** v0.6.0
**Duration:** ~1.5 hours

### Stats

| Metric | Value |
|--------|-------|
| Phases | 4 |
| Plans | 4 |
| Tests | 460 passing (179 core + 281 coda) |
| Pi tools | 10 (was 9) |
| Modules | 5 (12 prompt files) |
| TypeScript | `tsc --noEmit` clean |

### Key Accomplishments

- Removed legacy module artifacts: old todd.md/walt.md flat prompts and backward-compat modules barrel.
- Built centralized VCS integration (`vcs.ts`): `createBranch` (feat/ vs fix/ by issue type), `commitTask` (per-BUILD-task auto-commit), `getCurrentBranch`. All operations best-effort — VCS failures never break CODA tools.
- Added `/coda activate <slug>` command: sets `focus_issue` + `phase` from issue record, creates feature branch via VCS.
- Wired auto-commit into `coda_update` handler: task marked "complete" during BUILD phase triggers `commitTask`.
- Added `coda_query` tool (10th Pi tool): list/filter records by type (issue, task, plan, record, reference, decision) with status/topic/issue filters. Returns frontmatter only for compact responses.
- Confirmed findings summarization already implemented — `loadModuleFindingsSummary` wired into verify + unify since v0.3.
- Tests grew from 433 to 460 (+27 new tests: 13 VCS, 4 activate, 13 query).

### Key Decisions

- VCS lives in L6 (workflow), wired into L7 (Pi) — respects layered architecture perfectly.
- All git operations use `execSync` — synchronous, simple, best-effort.
- `registerTools` signature expanded with backward-compatible `projectRoot` default.

---

## ✅ v0.5 Module Completion

**Completed:** 2026-04-03
**Version:** v0.5.0
**Duration:** ~1.5 hours

### Stats

| Metric | Value |
|--------|-------|
| Phases | 3 |
| Plans | 3 |
| Tests | 433 passing (179 core + 254 coda) |
| Modules | 5 (security, tdd, architecture, quality, knowledge) |
| Prompt files | 12 across 5 modules |
| TypeScript | `tsc --noEmit` clean |
| External deps in core | 0 |

### Key Accomplishments

- Fixed 4 E2E findings from v0.4 stress test: `scaffoldCoda()` now creates `state.json` (F4), new `coda_config` tool for get/set on `coda.json` (F2), build loop auto-advance instruction (F6), improved `coda_report_findings` UX (F8).
- Added 3 new modules (architecture, quality, knowledge) with 7 prompt files and 3 registry definitions — module system scaled from 2 to 5 modules with zero infrastructure changes.
- Data-driven prompt test framework auto-generated 35 structural tests from MODULE_DEFINITIONS with zero test code changes.
- Full E2E validation: all 5 modules fire at correct hook boundaries, 10/12 hooks verified, 10 findings produced in live CMUX stress test.
- Module advisory proven more effective than blocking — security pre-plan warning caused agent to self-correct without needing the block gate.
- Tests grew from 386 to 433 (+47 new tests).

### Key Decisions

- No new architectural decisions — v0.5 was an execution/validation milestone that proved the v0.3 module architecture scales cleanly.
- Parallel pals-implementer delegation validated for independent tasks with zero file overlap.

---

## ✅ v0.4 Live Validation

**Completed:** 2026-03-29  
**Version:** v0.4.0  
**Duration:** ~3 hours (single day)

### Stats

| Metric | Value |
|--------|-------|
| Phases | 3 |
| Plans | 3 |
| Files changed | 21 |
| Tests | 386 passing (144 core + 242 coda) |
| TypeScript | `tsc --noEmit` clean |
| External deps in core | 0 |

### Key Accomplishments

- Fixed 10 operational issues (LIVE-01 through LIVE-10): path traversal, shell injection, forge wiring, findings persistence at runtime, post-task/post-build module dispatch, create_if_missing, explicit project root, error handling, numeric sorting, write gate strengthening.
- Deep code review found and fixed 10 of 11 findings (2 critical + 5 high + 3 medium): slug validation, sticky findings replacement semantics, write gate fail-closed, tool_call error handling, coda_status context, blockThreshold validation.
- Ran a full E2E real-project test via CMUX-scripted Pi session: GPT-5.4 built a TODO CLI through the complete CODA lifecycle (forge → specify → plan → build with TDD → verify → unify → done). **8/8 lifecycle phases PASS.**
- Module system confirmed firing at runtime — security analysis produced real findings during the plan phase.
- TDD gate confirmed working — agent wrote tests first, gate enforced discipline.
- Cataloged 4 findings (F2, F4, F6, F8) for v0.5: scaffoldCoda state.json gap, coda.json config tool gap, build loop auto-advance, coda_report_findings UX.

### Key Decisions

- D6: `coda_report_findings` explicit tool approach — agent submits findings via tool call rather than passive response interception. More reliable, Pi API compatible.
- Sticky findings replaced with latest-per-hookPoint semantics — prevents stale findings from accumulating across phases.
- Write gate fail-closed on malformed state — if state can't be read, block writes rather than allowing unguarded access.

---

## ✅ v0.1 Initial Release

**Completed:** 2026-03-29  
**Version:** v0.1.0  
**Duration:** ~12 hours

### Stats

| Metric | Value |
|--------|-------|
| Phases | 8 |
| Plans | 9 |
| Files changed | 63 |
| Tests | 188 passing |
| TypeScript | `tsc --noEmit` clean |

### Key Accomplishments

- Built the `@coda/core` data layer for markdown records, YAML frontmatter, section operations, and directory listing.
- Added the state engine with gated phase transitions, structured gate results, and atomic persistence.
- Implemented the CODA tool layer: create, read, update, edit-body, advance, status, run-tests, and write-gate protections.
- Shipped Todd and Walt as data-backed module prompts with hook-point routing.
- Built FORGE greenfield scaffolding, reference-doc generation, and first-milestone creation.
- Added the workflow engine: context builder, phase runner, and build-loop sequencing.
- Integrated CODA into Pi with `/coda`, 7 registered tools, lifecycle hooks, and extension entrypoint.
- Rewrote the Pi integration against the real `ExtensionAPI` and completed a live end-to-end dogfood run.
- Closed milestone verification with 188 passing tests, clean TypeScript, and a reusable E2E playbook plus findings report.

### Key Decisions

- Manual YAML parser in `@coda/core` to keep the core package free of external parsing dependencies.
- State gates return structured `{ passed, reason }` results instead of throwing.
- State persistence uses temp-file + rename for atomic writes.
- Pi integration uses a single `/coda` command with subcommand parsing to match Pi's command model.
- Replaced `import.meta.dir` with `import.meta.url` + `fileURLToPath` for Bun and jiti compatibility.
- Used a temporary `node_modules/@coda/core` symlink during E2E; long-term fix should bundle or publish the dependency boundary cleanly.

---

## ✅ v0.2 Autonomous Loops

**Completed:** 2026-04-01
**Version:** v0.2.0
**Duration:** 4 days (2026-03-29 to 2026-04-01)

### Stats

| Metric | Value |
|--------|-------|
| Phases | 9 |
| Plans | 10 (9 phase plans + 1 fix) |
| Tests | 255 passing |
| TypeScript | `tsc --noEmit` clean |
| External deps in core | 0 |

### Key Accomplishments

- Added `submode`, `loop_iteration`, exhaustion checks, and loop config to the core state machine.
- Built the autonomous review/revise runner with deterministic structural checks, durable revision-instructions artifacts, and revision history.
- Built the autonomous verify/correct runner with per-AC failure artifacts, correction task generation, and BUILD-loop integration.
- Added the human review gate with durable `human_review_status`, review→build gating, and persisted human feedback routing.
- Implemented exhaustion handling with explicit exhausted outcomes, human recovery paths, and durable `/coda back` and `/coda kill` operator commands.
- Updated Pi integration with submode-aware `before_agent_start`, command/status guidance, and workflow-owned runtime metadata for revise/correct flows.
- Resolved the live operator trigger gap so `coda_advance` into `review`/`verify` runs the autonomous loops and queues follow-up turns through Pi messaging.
- Fixed the `loadTasks()` boundary to normalize optional array fields, preventing crashes when live-created tasks omit `depends_on` or other optional frontmatter.
- Completed live CMUX/Pi validation: review → revise → re-review → build → verify all passed in a fresh session.

### Key Decisions

- Submodes remain phase-local, not new top-level phases — preserves linear lifecycle while enabling bounded review/verify cycles.
- Deterministic structural review writes durable revision artifacts — keeps the loop mechanical, auditable, and disk-backed.
- Human review state persists in existing plan frontmatter/body artifacts — no new storage layers.
- Exhausted loops preserve artifacts and require explicit human recovery — prevents hidden auto-advancement.
- Pi-facing runtime metadata comes from workflow-owned phase context — keeps Pi integration thin.
- Successful `coda_advance` into `review`/`verify` is the supported live autonomous trigger — closes the operator-surface gap without widening the command surface.
- Optional frontmatter arrays are normalized at the `loadTasks()` boundary — single defense point protects all downstream runners.

---

## ✅ v0.3 Module System

**Completed:** 2026-03-29
**Version:** v0.3.0
**Duration:** ~2 days (2026-04-01 to 2026-03-29)

### Stats

| Metric | Value |
|--------|-------|
| Phases | 8 |
| Plans | 8 |
| Files changed | 33 |
| Tests | 363 passing (144 core + 219 coda) |
| TypeScript | `tsc --noEmit` clean |
| External deps in core | 0 |

### Key Accomplishments

- Built foundational module types in `@coda/core` L3: `HookPoint`, `FindingSeverity`, `Finding`, `HookResult`, `ModuleDefinition` with `validateFinding`/`validateFindings` schema validation.
- Implemented module registry with hardcoded `security` + `tdd` definitions, config-driven enable/disable, priority-sorted hook lookup, and prompt path resolution.
- Created the two-method dispatcher API: `assemblePrompts()` for phase-boundary prompt injection and `parseAndCheckFindings()` for structured finding extraction with `exceedsThreshold` blocking.
- Shipped 5 prompt files (security/pre-plan, security/post-build, tdd/pre-build, tdd/post-task, tdd/post-build) with 25 structural tests.
- Wired modules into the workflow engine: dispatcher fires at phase boundaries, `moduleBlockFindings` blocks build→verify gate, old todd/walt system deleted.
- Added config integration: `coda.json` `modules` section drives per-project enable/disable and `blockThreshold` overrides.
- Implemented findings persistence to `.coda/issues/{slug}/module-findings.json` with `summarizeFindings` for cross-phase context injection in verify/unify phases.
- Created 22 E2E tests validating the complete integrated path: config → registry → dispatcher → prompts → findings → persistence → gates → context summarization.

### Key Decisions

- D1: `blockThreshold: FindingSeverity | 'none'` — enables advisory-only modules that never block.
- D2: Two-method dispatcher API (`assemblePrompts` + `parseAndCheckFindings`) — keeps the dispatcher session-unaware.
- D3: Only security + tdd in v0.3 — no half-registered modules; architecture/quality/knowledge modules deferred to v0.3.1.
- D4: Old todd/walt deleted at workflow integration — single clean migration cut.
- D5: `moduleBlockFindings` in `GateCheckData` — gate system remains the authority for phase transitions.

---
