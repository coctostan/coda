# Architecture

*Generated: 2026-03-28*

## Pattern Overview

**Workspace monorepo** with a **strict layered architecture** and **spec-driven development**.

- Monorepo defined in `package.json` with `packages/*` workspaces
- Layer boundaries enforced by convention (documented in `AGENTS.md`)
- Canonical system behavior specified in `docs/coda-spec-v7.md`
- Domain-driven abstractions (not MVC)

## Layers

### Package-Level Dependencies
```
core ← coda / muse / lens / helm
```
Extension packages depend on `@coda/core`. No sideways dependencies between extensions. Core has no dependency on extensions.

### Core Package Layers (L1–L3)
```
L1: Data    ← L2: State    ← L3: Modules
```
- **L1 Data** — mdbase-style markdown records (issue, plan, task, record, reference) — `docs/v0.1/01-data-layer.md`
- **L2 State** — Runtime state machine, phase tracking in `state.json` — `docs/v0.1/02-state-engine.md`
- **L3 Modules** — Module system, hooks, findings — `docs/v0.1/04-modules.md`

### CODA Package Layers (L4–L7)
```
L4: Tools   ← L5: FORGE    ← L6: Workflow  ← L7: Pi
```
- **L4 Tools** — `coda_*` functions that validate and mutate records/state — `docs/v0.1/03-tool-layer.md`
- **L5 FORGE** — Design layer, greenfield scaffolding — `docs/v0.1/05-forge-greenfield.md`
- **L6 Workflow** — Phase transitions, build loop, session boundaries — `docs/v0.1/06-workflow-engine.md`
- **L7 Pi** — Commands, hooks, and tool registration with host — `docs/v0.1/07-pi-integration.md`

**Import rule:** Imports flow downward only. Higher layers depend on lower layers, never the reverse.

## Data Flow

1. **Reference data** lives in mdbase-style markdown records (`.coda/` directory)
2. **Runtime state** stored in `state.json` as a cursor; issue phase is the durable authority
3. **Tools** mutate data/state through validated APIs (`coda_create`, `coda_update`, `coda_read`, `coda_advance`, etc.)
4. **Workflow** orchestrates phase transitions: SPECIFY → PLAN → REVIEW → BUILD → VERIFY → UNIFY
5. **Pi integration** wires commands, hooks, and tools into the host agent

## Key Abstractions

- **mdbase records** — Issue, plan, task, record, reference (data layer)
- **State machine** — Phase/submode tracking with `CodaState` (state layer)
- **Gates** — Transition checks (`Gate`, `GateCheckData`) controlling phase advancement
- **Tools** — `coda_*` validated mutation functions (tool layer)
- **Modules** — `Module`, `ModuleHook`, `Finding` for analysis/enforcement
- **Workflow phases** — SPECIFY, PLAN, REVIEW, BUILD, VERIFY, UNIFY
- **Hooks** — `before_agent_start`, `tool_call`, `agent_end`

## Entry Points

| File | Type | Description |
|------|------|-------------|
| `packages/core/src/index.ts` | Library barrel | Shared core surface (stub) |
| `packages/coda/src/index.ts` | Extension entry | CODA Pi extension (stub) |
| `packages/muse/src/index.ts` | Extension entry | MUSE ideation workflow (stub) |
| `packages/lens/src/index.ts` | Extension entry | LENS audit workflow (stub) |
| `packages/helm/src/index.ts` | Extension entry | HELM workspace operator (stub) |

**Planned but not yet created:**
- `packages/coda/src/pi/index.ts` — Pi extension default export
- `packages/core/src/data/`, `packages/core/src/state/`, `packages/core/src/modules/` — Layer subdirectories

## Brownfield Quick Start — Patterns to Preserve

### Layer Boundaries
- `AGENTS.md` explicitly requires downward-only imports within and between packages
- No sideways imports between extension packages
- `@coda/core` stays dependency-free from extensions

### Error Handling
- Fail-fast behavior: missing test commands fail, don't degrade silently
- Invalid phase transitions return structured `gate_name` / `reason` data
- State writes are atomic (`.tmp` + rename); recovery rebuilds from data
- Structured error returns over exceptions for workflow gates and tool calls

### Configuration
- Root tooling config: `package.json`, `tsconfig.json`
- Package-local config: `packages/*/package.json`
- Runtime project config: `.coda/coda.json` (planned)

### Data Conventions
- `.coda/` directory is write-protected — all modifications through `coda_*` tools
- Module prompts are data, not TypeScript — live in `modules/prompts/`
- Eval cases ship with prompts in `modules/evals/{module}.json`

---
*ARCHITECTURE.md — system design and patterns*
