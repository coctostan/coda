# Project: coda-ecosystem

## Description
- v0.7 Brownfield & Context in progress: SCAN + SYNTHESIZE + GAP shipped — 558 tests, 10 tools, 5 modules + init-scan, tsc clean
## Core Value
Enabling developers to build durable, maintainable software through disciplined agent-assisted workflows — bridging the gap between vibe coding speed and production-quality outcomes.

## Current State
| Attribute | Value |
|-----------|-------|
| Version | 0.7.0 |
| Status | Milestone v0.7 in progress |
| Last Updated | 2026-04-03 |

**Current system summary:**
- Monorepo scaffolded with 5 packages (`core`, `coda`, `muse`, `lens`, `helm`)
- `@coda/core` ships the L1/L2 foundation: markdown data layer, gated state engine, and v0.2 submode/loop primitives
- `@coda/coda` ships tools (9 coda_* tools), modules, FORGE, workflow engine, and Pi integration
- 5 modules active: security, tdd, architecture, quality, knowledge — 12 prompt files across 5 hook points
- Autonomous review/revise and verify/correct loops run deterministically from the supported `coda_advance` trigger path
- Human review gate blocks BUILD until human approval is recorded
- Exhaustion handling pauses automation and routes operators through `/coda back` and `/coda kill`
- 433 tests passing (179 core + 254 coda), TypeScript strict, no `any` types in source, zero external deps in core
- v0.5 Module Completion complete: 4 E2E fixes, 3 new modules, E2E validation with all 5 modules firing

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
### Active
- [ ] Resolve the temporary `@coda/core` symlink used by jiti during Pi extension loading
- [ ] Decide whether the repo-root `modules.yaml` symlink remains a local workspace fix or becomes a portable bootstrap step
- [ ] Align `docs/v0.1/07-pi-integration.md` with the shipped real-`ExtensionAPI` implementation
- [ ] Refresh the canonical v0.2 CMUX runbook to match the current cmux CLI syntax
### Planned
- Topic-based section retrieval integration into context-builder (Phase 39)
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
| Milestone v0.7 progress | 11 phases | 8 of 11 complete |
| Test suite | Green | 558 passing, 0 failing |
| TypeScript | Clean build | `tsc --noEmit` clean |
| Pi tools | 10 registered | 10/10 ✅ |
| Modules | 5 modules active | security, tdd, architecture, quality, knowledge ✅ |
| Topic retrieval | getSectionsByTopics + getSectionHeadings | Phase 36 PASS ✅ |

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

## Links
- `PRD.md` — deeper product-definition context
- `.paul/ROADMAP.md` — milestone and phase structure
- `.paul/MILESTONES.md` — completed milestone history
- `.paul/codebase/` — brownfield evidence and codebase map artifacts

---
*Last updated: 2026-04-03 after Phase 36 (Topic-based Section Retrieval)*
