# Project: coda-ecosystem

## Description
A suite of Pi extensions for disciplined, agent-assisted software development. The CODA ecosystem provides a structured process for building durable, quality software using AI agents as a true development team.

## Core Value
Enabling developers to build durable, maintainable software through disciplined agent-assisted workflows — bridging the gap between vibe coding speed and production-quality outcomes.

## Current State
| Attribute | Value |
|-----------|-------|
| Version | 0.2.0 |
| Status | Milestone v0.2 in progress |
| Last Updated | 2026-03-29 |

**Current system summary:**
- Monorepo scaffolded with 5 packages (`core`, `coda`, `muse`, `lens`, `helm`)
- `@coda/core` ships the L1/L2 foundation: markdown data layer, gated state engine, and v0.2 submode/loop primitives
- `@coda/coda` ships tools, modules, FORGE, workflow engine, and Pi integration
- Live Pi extension validated end-to-end against the real `ExtensionAPI`
- 212 tests passing, TypeScript strict, no `any` types in source, zero external deps in core

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
### Active
- [ ] Autonomous verify/correct runner + correction tasks (Phase 11 — v0.2)
- [ ] Human review gate (Phase 12 — v0.2)
- [ ] Exhaustion handling + rewind/kill controls (Phase 13 — v0.2)
- [ ] Pi integration updates for submode-aware execution (Phase 14 — v0.2)
- [ ] E2E validation for all v0.2 autonomous-loop scenarios (Phase 15 — v0.2)
- [ ] Resolve the temporary `@coda/core` symlink used by jiti during Pi extension loading
- [ ] Align `docs/v0.1/07-pi-integration.md` with the shipped real-`ExtensionAPI` implementation
### Planned
- [ ] Define v0.3 scope after v0.2 completion
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
| Milestone v0.2 progress | 7 phases complete | 2 of 7 complete |
| Test suite | Green | 212 passing, 0 failing |
| TypeScript | Clean build | `tsc --noEmit` clean |
| Review/verify primitives | Landed in core | PASS |
| Pi validation | Live extension works in Pi | PASS from v0.1 baseline |

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

## Links
- `PRD.md` — deeper product-definition context
- `.paul/ROADMAP.md` — milestone and phase structure
- `.paul/MILESTONES.md` — completed milestone history
- `.paul/codebase/` — brownfield evidence and codebase map artifacts

---
*Last updated: 2026-03-29 after Phase 10*
