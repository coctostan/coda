# Product Requirements: coda-ecosystem

## Problem / Opportunity
Vibe coding is great until you want to build something you can continue to develop or maintain over time. This structure provides a process to build durable, quality software. Current agentic coding tools optimize for speed but lack the discipline, lifecycle management, and quality gates needed for production-grade software.

## Why Now
Vibe coding is mainstream — AI-assisted development is the default for many developers. But the gap between quick prototypes and maintainable, shippable software is widening. Developers need a structured bridge that preserves agentic speed while enforcing quality, architecture, and process discipline.

## Current State / Existing System Context
- Scaffolded monorepo with 5 TypeScript packages: `packages/core`, `packages/coda`, `packages/muse`, `packages/lens`, `packages/helm`
- Extensive specification documents already authored (`docs/coda-spec-v7.md`, `docs/v0.1/` layer docs)
- All source entrypoints are stubs — no runtime implementation exists
- Architecture rules defined in `AGENTS.md` (layered, strict dependency direction)
- Build order specified: core (M1–M3) first, then coda (M4–M7)
- See `.paul/codebase/` for detailed brownfield evidence

## Desired Outcome
A working CODA extension that enforces disciplined software development through Pi — with a data schema that tracks issues/tasks/plans, a state engine that manages phase transitions, and minimal tooling that proves the concept end-to-end.

## Target Users and Needs
### Primary Users
- Serious agentic software developers
- Need their agentic platform to work as a true software development team
- Want production-quality outcomes without sacrificing agentic development speed
- Need lifecycle management: planning, building, verifying, and shipping

## Requirements
### Must Have
- Data schema and platform foundation (core L1 data layer, L2 state engine)
- Minimal tooling to prove the concept (coda L4 tool layer)

### Should Have / Nice to Have
- Module system for extensible analysis (core L3)
- FORGE design layer for project scaffolding (coda L5)
- Workflow engine for phase orchestration (coda L6)

### Explicitly Deferred
- MUSE ideation & incubation extension
- LENS deep multi-domain audit extension
- HELM multi-project workspace operator
- Full module prompt/eval ecosystem
- External service integrations (databases, auth, CI/CD)

### Out of Scope
- Non-Pi platform support
- GUI/web interfaces
- Multi-user collaboration features (v1)

## Constraints & Dependencies
### Constraints
- None explicitly captured

### Dependencies / Integrations
- Pi extension platform (`@mariozechner/pi-ai`, `@mariozechner/pi-agent-core`, `@mariozechner/pi-coding-agent`, `@mariozechner/pi-tui`)
- Bun runtime and test runner
- TypeScript 5.8+ with strict mode

## Assumptions
- TBD

## Open Questions
- TBD

## Recommended Direction
Follow the build order from `AGENTS.md`: implement core (L1 data → L2 state → L3 modules) first, then coda (L4 tools → L5 forge → L6 workflow → L7 pi). Start with data schema and state engine to establish the foundation, then build minimal tools to prove the concept end-to-end. Leverage the extensive specs in `docs/v0.1/` as implementation blueprints.

## Supporting References
- `.paul/PROJECT.md` — compact landing brief
- `.paul/codebase/` — brownfield evidence and codebase map
- `docs/coda-spec-v7.md` — canonical CODA specification
- `docs/v0.1/` — MVP layer implementation docs
- `docs/module-gaps-and-onboarding.md` — FORGE, modules, ecosystem analysis

---
*Created: 2026-03-28*
