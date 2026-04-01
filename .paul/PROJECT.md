# Project: coda-ecosystem

## Description
- v0.3 Module System in progress: types + registry + dispatcher + prompts + workflow + config landed (Phases 18-23)

## Core Value
Enabling developers to build durable, maintainable software through disciplined agent-assisted workflows — bridging the gap between vibe coding speed and production-quality outcomes.

## Current State
| Attribute | Value |
|-----------|-------|
| Version | 0.2.0 |
| Status | Milestone v0.2 complete |
| Last Updated | 2026-04-01 |

**Current system summary:**
- Monorepo scaffolded with 5 packages (`core`, `coda`, `muse`, `lens`, `helm`)
- `@coda/core` ships the L1/L2 foundation: markdown data layer, gated state engine, and v0.2 submode/loop primitives
- `@coda/coda` ships tools, modules, FORGE, workflow engine, and Pi integration
- Autonomous review/revise and verify/correct loops run deterministically from the supported `coda_advance` trigger path
- Human review gate blocks BUILD until human approval is recorded
- Exhaustion handling pauses automation and routes operators through `/coda back` and `/coda kill`
- 315 tests passing (140 core + 175 coda), TypeScript strict, no `any` types in source, zero external deps in core
- v0.3 Module System in progress: types + registry + dispatcher + prompts + workflow + config landed (Phases 18-23)

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
### Active
- [ ] Resolve the temporary `@coda/core` symlink used by jiti during Pi extension loading
- [ ] Decide whether the repo-root `modules.yaml` symlink remains a local workspace fix or becomes a portable bootstrap step
- [ ] Align `docs/v0.1/07-pi-integration.md` with the shipped real-`ExtensionAPI` implementation
- [ ] Refresh the canonical v0.2 CMUX runbook to match the current cmux CLI syntax
### Planned
- [ ] v0.3 Module System — findings persistence, E2E validation (Phases 24-25)
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
| Milestone v0.2 progress | 9 phases complete | 9 of 9 complete ✅ |
| Test suite | Green | 255 passing, 0 failing |
| TypeScript | Clean build | `tsc --noEmit` clean |
| Review/verify primitives | Landed in core | PASS |
| Human review gate | Durable pending/approval/change-request flow | PASS |
| Exhaustion recovery controls | Durable pause, rewind, and kill behavior | PASS |
| Pi validation | Live extension exposes the supported autonomous trigger path for review/verify | PASS |
| Live E2E | Clean CMUX/Pi rerun with all autonomous scenarios passing | PASS |

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

## Links
- `PRD.md` — deeper product-definition context
- `.paul/ROADMAP.md` — milestone and phase structure
- `.paul/MILESTONES.md` — completed milestone history
- `.paul/codebase/` — brownfield evidence and codebase map artifacts

---
*Last updated: 2026-04-01 after Phase 23 (Config Integration) completion*
