# Project: coda-ecosystem

## Description
A suite of Pi extensions for disciplined, agent-assisted software development. The CODA ecosystem provides a structured process for building durable, quality software using AI agents as a true development team.

## Core Value
Enabling developers to build durable, maintainable software through disciplined agent-assisted workflows — bridging the gap between vibe coding speed and production-quality outcomes.

## Current State
| Attribute | Value |
|-----------|-------|
| Version | 0.1.0 |
| Status | Active Development |
| Last Updated | 2026-03-28 |

**Current system summary:**
- Scaffolded monorepo with 5 packages (core, coda, muse, lens, helm)
- Extensive specs: `docs/coda-spec-v7.md` (1900+ lines), `docs/v0.1/` (8 layer docs)
- Core package fully implemented: data layer, state engine (67 tests)
- Coda package: tool layer (51 tests) + module prompts (11 tests)
- 129 tests passing, TypeScript strict, zero external deps

## Scope Snapshot
### Validated
- [x] Data layer — mdbase records, YAML frontmatter, section ops (Phase 1)
- [x] State engine — phase transitions, gates, atomic persist (Phase 2)
- [x] Tool layer — 7 coda_* tools + write-gate (Phase 3)
- [x] Two modules — Todd (TDD enforcement) + Walt (quality check) prompts with TS loaders (Phase 4)
- [x] FORGE design layer — greenfield scaffold + ref docs + milestone (Phase 5)
### Active
- [ ] Workflow engine (M6)
### Planned
- [ ] Pi integration (coda L7)
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
- To be refined during planning

## Key Decisions
| Decision | Rationale | Date | Status |
|----------|-----------|------|--------|
| Layered artifact model (`PROJECT.md` + `PRD.md`) adopted at init | Keep hot-path context concise while preserving deeper product definition | 2026-03-28 | Active |
| Spec-first development approach | Extensive docs precede implementation to ensure architectural clarity | 2026-03-28 | Active |

## Links
- `PRD.md` — deeper product-definition context
- `.paul/ROADMAP.md` — milestone and phase structure
- `.paul/codebase/` — brownfield evidence and codebase map artifacts

---
*Last updated: 2026-03-28 after Phase 5*
