# Project: coda-ecosystem

## Description
- v0.8 The Compounding Engine COMPLETE (51 phases, 655 tests, 10 tools, 5 modules + overlays + gate automation + UNIFY runner + review gate, tsc clean). v0.9 Live Compounding Validation COMPLETE (scoped down — Phase 52 shipped 8-finding E2E report, Phase 53 Brownfield deferred to v0.11+). v0.10 Close the Agent Loop closed as a documented failure after Phase 57. v0.11 Six Fixes and Re-Validation is now the active milestone, targeting the remaining live SPECIFY → PLAN, VERIFY, and UNIFY gaps before another Script A proof run.
## Core Value
Enabling developers to build durable, maintainable software through disciplined agent-assisted workflows — bridging the gap between vibe coding speed and production-quality outcomes.

## Current State
| Attribute | Value |
|-----------|-------|
| Version | 0.11.0-dev |
| Status | v0.11 Six Fixes and Re-Validation — Phase 59 Lifecycle Integrity complete; ready to plan Phase 60 (E2E Re-Validation) |
| Last Updated | 2026-04-18 |
**Current system summary:**
- Monorepo scaffolded with 5 packages (`core`, `coda`, `muse`, `lens`, `helm`)
- `@coda/core` ships the L1/L2 foundation: markdown data layer, gated state engine, topic-based section retrieval, and dependency-aware carry-forward primitives
- `@coda/coda` ships 12 `coda_*` tools, modules, FORGE, workflow engine, and Pi integration
- 5 modules are active across lifecycle hooks, including post-unify quality and knowledge capture
- Autonomous review/revise and verify/correct loops are implemented, UNIFY has a structured workflow runner, and UNIFY output requires human review approval before DONE
- UNIFY Runner Core shipped in Phase 47: 5-action UNIFY prompt, expanded `unify→done` gate, and completion-record-backed gate data
- UNIFY Review Gate shipped in Phase 48: human review/approval mechanism for UNIFY output, `unify_review_status` on completion record, revision-aware UNIFY context, shared `findCompletionRecordPath()` helper
- Module Overlay Infrastructure shipped in Phase 49: two-layer prompt model (default + `.coda/modules/*.local.md` overlay), overlay-aware dispatcher, UNIFY compounding instruction (ACTION 3b), FORGE overlay seeding in SYNTHESIZE context
- Gate Automation shipped in Phase 50: configurable gate modes (human/auto/auto-unless-block) for 3 lifecycle transitions, per-issue-type overrides, backward compat with `human_review_default`
- E2E Validation shipped in Phase 51: 11 cross-feature E2E tests proving v0.8 features compose correctly, `/coda new`/review-runner/coda-status aligned with gate automation
- 751 tests passing, 1 todo, TypeScript strict clean, no `any` types in source, zero external deps in core
- Phase 53 (Agent Entry Points) shipped 2026-04-16: `coda_forge` + `coda_focus` as agent tools (tool count 10→12), slash commands refactored to thin wrappers, F7 write-gate integration guard + `DEBUG=coda:*` diagnostic
- Phase 54 (UNIFY Produces Artifacts) shipped 2026-04-16: evidence-based `unify→done` gate with `artifacts_produced` schema on `CompletionRecord`, ceremony-aware relaxation for `refactor`/`chore`/`docs`, spec-delta enforcement regardless of ceremony, UNIFY runner prompt restructured to emit artifacts_produced YAML schema + explicit path-collection instruction (708 tests)
- Phase 55 shipped 2026-04-16: runtime-portable `coda_run_tests`, deeper write-gate hardening, and `human_review_default` removal with on-load gates migration (720 pass / 1 todo)
- Phase 56 shipped 2026-04-17: `before_agent_start` now bootstraps unfocused sessions into forge/create/focus, phase/build prompts reinforce lifecycle-local next steps, and `coda_status`/`coda_focus`/`coda_forge` now return concrete tool-first handoffs (722 pass / 1 todo)
- v0.10 closed 2026-04-17 as a documented failure: the live Script A rerun proved entry is better (`coda_forge`, `coda_focus`, configured `coda_run_tests`), but live SPECIFY → PLAN advance, VERIFY truthfulness, and UNIFY artifact/completion behavior still fail
- Phase 58 shipped 2026-04-18: `codaAdvance` survives sparse SPECIFY frontmatter (normalizeIssueFrontmatter), `replaceSection` is strict with typed `ReplaceSectionError`, `coda_edit_body` only appends on explicit `create_if_missing`, FORGE scaffold seeds `bun test` only when Bun signals are unambiguous and otherwise directs the agent to `coda_config` (740 pass / 1 todo)
- Phase 59 shipped 2026-04-18: VERIFY now fails closed on missing explicit evidence, VERIFY/UNIFY prompts are gate-aligned, and reachable-path lifecycle coverage proves dishonest VERIFY / empty UNIFY block while honest VERIFY + real artifacts advance to `done` (751 pass / 1 todo)

## Scope Snapshot
### Validated
- [x] Data layer — mdbase records, YAML frontmatter, section ops (Phase 1 — v0.1)
- [x] State engine — phase transitions, gates, atomic persist (Phase 2 — v0.1)
- [x] Tool layer — 7 coda_* tools + write-gate (Phase 3 — v0.1)
- [x] Two modules — Todd (TDD enforcement) + Walt (quality check) prompts with TS loaders (Phase 4 — v0.1)
- [x] FORGE design layer — greenfield scaffold + ref docs + milestone (Phase 5 — v0.1)
- [x] Workflow engine — context builder, phase runner, build loop (Phase 6 — v0.1)
- [x] Pi integration — commands, tools, hooks, extension entry point (Phase 7 — v0.1)
- [x] E2E validation — live Pi session dogfood, findings, and reusable test playbook (Phase 8 — v0.1)
- [x] State submodes + loop tracking — `submode`, `loop_iteration`, exhaustion checks, and loop config defaults (Phase 9 — v0.2)
- [x] Autonomous review/revise runner — deterministic structural review, revision instructions/history, and review-context injection (Phase 10 — v0.2)
- [x] Autonomous verify/correct runner — deterministic failure artifacts, correction task generation, and correction-task BUILD context (Phase 11 — v0.2)
- [x] Human review gate — durable `human_review_status`, review→build gating, and persisted human feedback routing (Phase 12 — v0.2)
- [x] Exhaustion handling + rewind/kill controls — explicit exhausted outcomes, human recovery paths, and durable rewind/kill commands (Phase 13 — v0.2)
- [x] Pi integration updates — submode-aware `before_agent_start`, command/status guidance, and workflow-owned runtime metadata for revise/correct flows (Phase 14 — v0.2)
- [x] Live operator trigger resolution — successful `coda_advance` into `review`/`verify` now runs the deterministic autonomous loops and queues Pi follow-up turns when needed (Phase 16 — v0.2)
- [x] Live E2E validation — clean CMUX/Pi rerun with review → revise → re-review → build → verify all passing (Phase 17 — v0.2)
- [x] Module types + finding schema — HookPoint, FindingSeverity, Finding, validateFinding/validateFindings in @coda/core L3 (Phase 18 — v0.3)
- [x] Module registry — createRegistry, MODULE_DEFINITIONS, getEnabledModules/getModulesForHook/resolvePromptPath (Phase 19 — v0.3)
- [x] Module dispatcher — assemblePrompts() + parseAndCheckFindings(), exceedsThreshold helper (Phase 20 — v0.3)
- [x] Module prompts — 5 prompt files for security + tdd modules following v0.3 convention, 25 structural tests (Phase 21 — v0.3)
- [x] Workflow integration — dispatcher wired into phase-runner + build-loop, moduleBlockFindings gate, old todd/walt deleted (Phase 22 — v0.3)
- [x] Config integration — coda.json modules section drives enable/disable + blockThreshold per project (Phase 23 — v0.3)
- [x] Findings persistence + context summarization — module-findings.json, summarizeFindings, cross-phase context in verify/unify (Phase 24 — v0.3)
- [x] E2E validation — 22 E2E tests covering full module system path: config → registry → dispatcher → prompts → findings → persistence → gates → context (Phase 25 — v0.3)
- [x] Operational fixes — path traversal, shell injection, forge wiring, findings persistence, module dispatch, create_if_missing, project root, error handling, numeric sorting, write gate (Phase 26 — v0.4)
- [x] Deep code review — 2 critical + 5 high + 3 medium findings fixed: slug validation, sticky findings, write gate fail-closed, tool_call error handling, config validation (Phase 27 — v0.4)
- [x] E2E real-project stress test — CMUX-scripted Pi session, GPT-5.4 built TODO CLI through full lifecycle, 8/8 phases PASS, module system fires at runtime (Phase 28 — v0.4)
- [x] scaffoldCoda state.json creation — `scaffoldCoda()` now creates `state.json` via `createDefaultState()` + `persistState()` (Phase 29 — v0.5, F4)
- [x] coda_config tool — new `coda_config` tool for get/set on `coda.json` with dot-path support, validation, error handling (Phase 29 — v0.5, F2)
- [x] Build loop auto-advance — Task Completion Protocol block added for non-correction tasks (Phase 29 — v0.5, F6)
- [x] Findings submission UX — improved `coda_report_findings` instruction with explicit JSON format, severity enum, examples (Phase 29 — v0.5, F8)
- [x] Module expansion — architecture, quality, knowledge modules added (7 prompt files, 3 registry definitions), 5 modules total with 12 prompts (Phase 30 — v0.5)
- [x] E2E validation — all 5 modules fire at correct hook points, 10/12 hooks verified, 10 findings produced in live test (Phase 31 — v0.5)
- [x] Module cleanup — removed legacy todd.md/walt.md flat prompts and backward-compat modules barrel (Phase 32 — v0.6)
- [x] VCS integration — `createBranch`, `commitTask`, `getCurrentBranch` in centralized vcs.ts, feat/ vs fix/ branch naming (Phase 33 — v0.6)
- [x] `/coda activate` command — sets focus_issue + phase from issue record, creates feature branch via VCS (Phase 33 — v0.6)
- [x] Auto-commit on BUILD task completion — coda_update handler triggers commitTask when task status → "complete" during BUILD (Phase 33 — v0.6)
- [x] `coda_query` tool — list/filter records by type (issue, task, plan, record, reference, decision) with status/topic/issue filters (Phase 34 — v0.6)
- [x] E2E validation — 460 tests, 0 fail, all v0.6 features verified (Phase 35 — v0.6)
- [x] Topic-based section retrieval — getSectionsByTopics + getSectionHeadings in core data layer, 12 new tests (Phase 36 — v0.7)
- [x] Dependency-based carry-forward — getCarryForwardSummaries with 3 selection paths (dependency/correction/recency), 6 new tests (Phase 37 — v0.7)
- [x] Adaptive ceremony rules — CeremonyRules for 5 issue types with config overrides, 9 new tests (Phase 38 — v0.7)
- [x] Context budget management — assembleWithinBudget, estimateTokens, PHASE_BUDGETS, advisory budgets with no mid-section truncation, 11 new tests (Phase 39 — v0.7)
- [x] Module init-scan hooks — 5 modules gain init-scan, brownfield detection, evidence file I/O, 5 init-scan prompts (Phase 40 — v0.7)
- [x] Brownfield SCAN — assembleScanContext orchestration, universal target detection, source dir detection, module prompt assembly (Phase 41 — v0.7)
- [x] Brownfield SYNTHESIZE — assembleSynthesizeContext, SYNTHESIZE_REF_DOCS (4 ref docs), evidence-to-ref-doc mapping (Phase 42 — v0.7)
- [x] Brownfield GAP ANALYSIS — GapDomain with dependency ordering, GAP-ANALYSIS.md artifact I/O (Phase 43 — v0.7)
- [x] Brownfield VALIDATE + ORIENT — structured review + direction questions, MILESTONE-PLAN.md I/O (Phase 44 — v0.7)
- [x] Wire brownfield into /coda forge — detectBackdrop routing, brownfield scan context in command (Phase 45 — v0.7)
- [x] E2E brownfield validation — 4 E2E tests covering full pipeline + context features + hooks + persistence (Phase 46 — v0.7)
- [x] UNIFY Runner Core - structured 5-action UNIFY context, expanded `unify→done` gate, completion-record-backed gate data (Phase 47 - v0.8)
- [x] Phase 48 — UNIFY Review Gate: human review/approval of autonomous UNIFY output before DONE (Phase 48 — v0.8)
- [x] Phase 49 — Module Overlay Infrastructure: two-layer prompt model, overlay-aware dispatcher, UNIFY compounding, FORGE seeding (Phase 49 — v0.8)
- [x] Phase 50 — Gate Automation: configurable gate modes (human/auto/auto-unless-block) for plan_review, build_review, unify_review transitions (Phase 50 — v0.8)
- [x] Phase 51 — E2E Validation: 11 cross-feature E2E tests, gate-aware `/coda new`, review-runner, and coda-status (Phase 51 — v0.8)
- [x] Phase 52 — Greenfield Compounding Test: Script A E2E via CMUX, 8 findings (3 critical), compounding engine does not compound in practice (Phase 52 — v0.9)
- [x] Phase 53 — Agent Entry Points: `coda_forge` + `coda_focus` tools land (tool count 10→12), slash commands refactored to thin wrappers, F7 write-gate integration guard + `DEBUG=coda:*` diagnostic (Phase 53 — v0.10)
- [x] Phase 54 — UNIFY Actually Produces Artifacts: evidence-based `unify→done` gate blocks empty-artifact UNIFY; CompletionRecord gains `artifacts_produced` + `exemptions`; runner prompt carries schema + ceremony-aware guidance (Phase 54 — v0.10, F5 headline fix)
- [x] Phase 55 — Supporting Systems Repair: runtime-agnostic `coda_run_tests` via injectable `SpawnImpl`; write-gate hardened against symlink/bash-compound/custom-tool bypass (parent-realpath + `coda_*` allow-list); `human_review_default` removed from `CodaConfig` with idempotent legacy→`gates` migration at load time; 4 duplicate `loadCodaConfig` helpers consolidated to one shared export (Phase 55 — v0.10)
- [x] Phase 56 — Lifecycle-First Prompts: unfocused-session bootstrap guidance, lifecycle-local phase/build prompts, and aligned tool-first `next_action` wording across forge/focus/status (Phase 56 — v0.10)
- [x] Phase 57 — E2E Re-Validation: re-run Script A and capture a binary live verdict; result = `still broken` because live phase advancement, verification, and UNIFY artifact completion remain incomplete (Phase 57 — v0.10)
- [x] Phase 58 — Lifecycle Bug Fixes: nil-safe SPECIFY → PLAN advance, strict `replaceSection` behavior, and conservative Bun-only scaffold test defaults (Phase 58 — v0.11)
- [x] Phase 59 — Lifecycle Integrity: fail-closed VERIFY evidence defaults, gate-aligned VERIFY/UNIFY prompts, and reachable-path lifecycle proof for honest artifact-producing DONE advancement (Phase 59 — v0.11)
### Planned
- [ ] v0.11 Phase 60 — E2E Re-Validation: re-run Script A with binary success/failure criteria.
- [ ] Brownfield Onboarding Test remains deferred until greenfield compounding works in live use.
### Out of Scope
- MUSE, LENS, HELM extensions — post-CODA
- Full module prompt/eval ecosystem
- External service integrations

## Target Users
**Primary:** Serious agentic software developers who need their agentic platform to work as a true software development team.

## Constraints
- Strict layered architecture: core ← coda/muse/lens/helm, downward-only imports
- TypeScript strict mode, no `any` types
- `.coda/` write-protected — all modifications through `coda_*` tools
- Module prompts are data, not TypeScript

## Success Metrics
| Metric | Target | Current |
|--------|--------|---------|
| Milestone v0.8 progress | 5 phases complete | 5 of 5 complete ✅ |
| Milestone v0.9 progress | 1 phase shipped (1 deferred) | 1 of 1 complete ✅ (Phase 53 deferred to v0.11+) |
| Milestone v0.10 progress | 5 phases (53-57) | 5 of 5 planned phases complete ⚠️ — closed as documented failure after Phase 57 |
| Milestone v0.11 progress | 3 phases (58-60) | 2 of 3 complete 🚧 |
| Test suite | Green | 751 passing, 0 failing (1 todo documented) |
| TypeScript | Clean build | `bun test` green (de-facto type check via Bun TS loader; repo has no installed tsc) |
| Pi tools | 12 registered | 12/12 ✅ (Phase 53 added `coda_forge` + `coda_focus`) |
| Modules | 5 modules active + overlays | security, tdd, architecture, quality, knowledge + overlay infrastructure ✅ |
| UNIFY runner | 5 mandatory actions wired | Phase 47 PASS ✅; Phase 54 made artifact production evidence-based (F5 fixed) ✅; Phase 59 hardened reachable-path integrity ✅ |
| UNIFY review gate | Human approval before DONE | Phase 48 PASS ✅ |
| Module overlays | Two-layer prompt model | Phase 49 PASS ✅; Phase 54 ensures overlays have real content via evidence gate ✅ |
| Gate automation | Configurable gate modes | Phase 50 PASS ✅ |
| E2E validation | Cross-feature composition | Phase 51 PASS ✅ |
| Live E2E (v0.9) | Compounding proven in practice | ❌ Not proven — drives v0.10 |
| Live E2E (v0.10) | Compounding proven in practice | ❌ Still broken — Phase 57 documented live SPECIFY → PLAN, VERIFY, and UNIFY gaps |
## Key Decisions
| Decision | Rationale | Date | Status |
|----------|-----------|------|--------|
| Layered artifact model (`PROJECT.md` + `PRD.md`) adopted at init | Keep hot-path context concise while preserving deeper product definition | 2026-03-28 | Active |
| Spec-first development approach | Extensive docs precede implementation to ensure architectural clarity | 2026-03-28 | Active |
| Manual YAML parser in core | Preserve zero-external-dependency core data layer | 2026-03-28 | Active |
| State gates return structured results | Keep lifecycle failures explicit and non-exception-driven | 2026-03-28 | Active |
| Pi integration uses the real `ExtensionAPI` | Match Pi's actual runtime model and avoid drift from custom wrapper types | 2026-03-28 | Active |
| `import.meta.url` + `fileURLToPath` replaces `import.meta.dir` | Maintain compatibility across Bun and Node/jiti extension loading | 2026-03-28 | Active |
| Autonomous-loop submodes are phase-local, not new top-level phases | Preserve linear lifecycle while allowing bounded review/verify cycles | 2026-03-29 | Active |
| Deterministic structural review writes durable revision artifacts | Keep Phase 10 review/revise loop mechanical, auditable, and disk-backed before later human/LLM gates | 2026-03-29 | Active |
| Deterministic verify failures become YAML artifacts and correction tasks | Keep the verify/correct loop mechanical, auditable, and reusable by BUILD without adding dependencies | 2026-03-29 | Active |
| Human review state is persisted in existing plan frontmatter/body artifacts | Add durable human control without introducing new storage or widening Phase 12 scope | 2026-03-29 | Active |
| Exhausted loops preserve artifacts and require explicit human recovery | Keep exhaustion handling auditable and prevent hidden auto-advancement | 2026-03-29 | Active |
| Pi-facing runtime metadata is emitted from workflow-owned phase context | Keep Pi integration thin while exposing canonical phase/submode/task state to the extension surface | 2026-03-29 | Active |
| Successful `coda_advance` into `review`/`verify` is the supported live autonomous trigger | Close the Phase 15 operator-surface gap without widening the command surface or changing core state semantics | 2026-03-30 | Active |
| Optional frontmatter arrays normalized at the `loadTasks()` boundary | Single defense point protects all downstream runners from missing optional fields | 2026-04-01 | Active |
| `coda_report_findings` explicit tool for findings persistence | Agent submits findings via tool call; Pi doesn't expose `after_agent_turn` hook | 2026-03-29 | Active |
| Sticky findings replaced with latest-per-hookPoint semantics | Prevent stale findings from accumulating across phases | 2026-03-29 | Active |
| Write gate fail-closed on malformed state | If state can't be read, block writes rather than allowing unguarded access | 2026-03-29 | Active |
| UNIFY remains autonomous; human validation is deferred to a gate-mediated follow-up phase | Keep Phase 47 focused on runner/gate infrastructure while reserving approval mechanics for Phase 48 | 2026-04-14 | Active |
| UNIFY diff presentation stays in the conversation channel | Avoid special TUI work for v0.8 while still surfacing compounding changes clearly | 2026-04-14 | Active |
| Overlay writes use `coda_edit_body` rather than a new v0.8 tool | Reuse existing mutation path and defer `coda_feedback` to a later milestone | 2026-04-14 | Active |
| Gate automation replaces `human_review_default` as the long-term approval model | Unify approval behavior under one configurable gate system | 2026-04-14 | Active |
| Aggregate UNIFY review gate (not per-action approval) | v0.8 uses post-UNIFY aggregate review; per-action interrupt deferred | 2026-04-14 | Active |
| Completion record carries `unify_review_status` | Disk-based signal for fresh-session revision detection without new submode | 2026-04-14 | Active |
| Shared `findCompletionRecordPath()` helper | 3 call sites (gate data, advance handler, UNIFY runner) share lookup | 2026-04-14 | Active |
| Overlay merge is append-only (default + project context) | Keep merge deterministic; overlay body appended after `## Project-Specific Context` header | 2026-04-14 | Active |
| Overlays seeded by agent via `coda_edit_body`, not programmatic write | Consistent with v0.8 D3; agent drives overlay creation during FORGE/UNIFY | 2026-04-14 | Active |
| Close v0.9 after Phase 52, defer Phase 53 | Brownfield test would hit same F1/F2/F5 blockers; fix those first | 2026-04-16 | Active |
| v0.10 "Close the Agent Loop" as full pivot from v0.9 | v0.8 compounding plumbing works in tests but doesn't compound in practice — fix end-to-end flow before more FORGE work | 2026-04-16 | Active |
| Add `coda_forge` and `coda_focus` as agent tools | Slash-command-only entry points block autonomous agent workflows | 2026-04-16 | Shipped (Phase 53) |
| F7 reframed as integration gap, not logic bug | `checkWriteGate`/`evaluateWriteGate` already block `.coda/*` for write+edit; Pi perimeter and path variants are the real question | 2026-04-16 | Active |
| Pi mutation tool surface = {write, edit} only | Audit of `@mariozechner/pi-coding-agent/dist/core/extensions/types.d.ts`: no `str_replace`/`apply_patch`/`multi_edit`/`create_file`/`patch` exist | 2026-04-16 | Active |
| Write-gate deeper hardening (symlink, bash-redirect, custom-tool bypass) deferred to Phase 55 | Phase 53 scope stayed tight: audit + integration test + diagnostic | 2026-04-16 | Active |
| Evidence mechanism for unify→done: hybrid self-report + disk verification | Agent declares `artifacts_produced` paths; gate verifies existence + non-empty content. Pure disk scan can't know intent; pure self-report failed F5 in v0.8 live test | 2026-04-16 | Shipped (Phase 54, DEC-54-1) |
| Ceremony knowledge stays in coda; gate stays layering-clean | `gatherGateData` in coda L4 calls `getCeremonyRules` and hands gate two pre-computed booleans; gate never imports from coda, no ceremony mirror in core | 2026-04-16 | Shipped (Phase 54, DEC-54-2) |
| Spec-delta enforcement is ceremony-independent | Ceremony relaxation covers empty artifacts; spec-delta enforcement honors explicit issue intent regardless of issue type | 2026-04-16 | Shipped (Phase 54, DEC-54-3) |
| Injectable SpawnImpl for runtime-portable child-process functions | codaRunTests adds test-only 4th arg; Bun fast-path + Node fallback selected by detectDefaultSpawn at call time; no globalThis masking needed | 2026-04-16 | Shipped (Phase 55, DEC-55-1) |
| Custom-tool default-deny with coda_* prefix allow-list | Pi extension authors may register mutation tools whose shape we don't know; explicit intent (coda_*) beats coincidental absence of `.coda/` in input | 2026-04-16 | Shipped (Phase 55, DEC-55-2) |
| Parent-directory realpath for symlink-safe `.coda/` protection | Write targets don't typically exist pre-write; leaf realpath throws ENOENT; parent-realpath is the sound invariant | 2026-04-16 | Shipped (Phase 55, DEC-55-3) |
| Legacy human_review_default → gates migration uses coarse DEFAULT_GATE_MODES seed | Shapes aren't 1:1 isomorphic (per-type boolean vs per-gate-point mode); operators add gate_overrides post-migration for legacy per-type semantics | 2026-04-16 | Shipped (Phase 55, DEC-55-4) |
| Shared loadCodaConfig consolidates 4 duplicate file-private helpers | Dedupe is the forcing function for introducing cross-cutting behavior (here: on-load migration); narrower pi/tools.ts loader intentionally stays put | 2026-04-16 | Shipped (Phase 55, DEC-55-5) |
| Perimeter detectors extracted to pi/write-gate-perimeter.ts | Refines Phase 53 perimeter-vs-pure-gate split into: pure gate (write-gate.ts) / Pi lifecycle glue (hooks.ts) / stateless detectors (write-gate-perimeter.ts) | 2026-04-16 | Shipped (Phase 55, DEC-55-6) |
| Keep lifecycle guidance inside existing prompt surfaces | Phase 56 corrected steering failures by strengthening bootstrap, phase, build, and `next_action` wording instead of adding a new prompt framework | 2026-04-17 | Shipped (Phase 56) |
| `before_agent_start` bootstraps unfocused sessions | Empty hook output invited build-first behavior; explicit forge/create/focus guidance redirects agents before production-code work starts | 2026-04-17 | Shipped (Phase 56) |
| `next_action` strings must name concrete CODA tools | Generic prose was too weak to steer autonomous agents; explicit tool names now align entry and lifecycle handoffs | 2026-04-17 | Shipped (Phase 56) |
| Phase 57 binary verdict remains `still broken` until live PLAN advancement, VERIFY truthfulness, and UNIFY artifact completion all hold | Entry improved, but the milestone contract failed in the real Script A rerun and same-session memory cannot be credited as compounding | 2026-04-17 | Active |
| VERIFY evidence defaults are fail-closed | Task coverage plus missing suite evidence cannot be trusted after the Phase 57 live over-claim; missing explicit evidence must block success | 2026-04-18 | Shipped (Phase 59, DEC-59-1) |
| `runVerifyRunner` reads `state.last_test_exit_code` directly | Reachable-path hardening was needed without widening `VerifyRunnerOptions` or reopening `packages/coda/src/pi/hooks.ts` | 2026-04-18 | Shipped (Phase 59, DEC-59-2) |
| UNIFY prompt/gate drift must fail tests, not operators | The evidence gate already had the right rules; the reachable path needed literal gate-reason parity plus explicit action sequencing | 2026-04-18 | Shipped (Phase 59, DEC-59-3) |

## Links
- `PRD.md` — deeper product-definition context
- `.paul/ROADMAP.md` — milestone and phase structure
- `.paul/MILESTONES.md` — completed milestone history
- `.paul/codebase/` — brownfield evidence and codebase map artifacts

---
*Last updated: 2026-04-18 — Phase 59 completed and v0.11 now points at the Phase 60 live re-validation plan*
