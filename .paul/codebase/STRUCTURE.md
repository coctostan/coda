# Directory Structure

*Generated: 2026-03-28*

## Top-Level Layout

```
coda/
├── AGENTS.md                    # Architecture and testing rules
├── README.md                    # Suite overview and package map
├── ROADMAP.md                   # Versioned milestones and build order
├── package.json                 # Workspace root (workspaces: packages/*)
├── tsconfig.json                # Root TypeScript config (strict, ESNext)
├── docs/                        # Specs and design documents
│   ├── coda-spec-v7.md          # Canonical CODA specification
│   ├── module-gaps-and-onboarding.md  # FORGE, modules, ecosystem analysis
│   └── v0.1/                    # MVP layer docs (numbered)
│       ├── 00-overview.md
│       ├── 01-data-layer.md
│       ├── 02-state-engine.md
│       ├── 03-tool-layer.md
│       ├── 04-modules.md
│       ├── 05-forge-greenfield.md
│       ├── 06-workflow-engine.md
│       └── 07-pi-integration.md
├── modules/                     # Shared prompt and eval data
│   ├── prompts/                 # Module prompts (empty)
│   └── evals/                   # Eval cases (empty)
├── packages/                    # Workspace packages
│   ├── core/                    # Shared infrastructure (L1-L3)
│   ├── coda/                    # CODA extension (L4-L7)
│   ├── muse/                    # MUSE ideation (stubbed)
│   ├── lens/                    # LENS audit (stubbed)
│   └── helm/                    # HELM workspace (stubbed)
└── .pi/                         # Pi agent config
    ├── settings.json
    └── agents/                  # Agent instruction files
```

## Package Structure (current)

Each package follows the same minimal pattern:

```
packages/{name}/
├── package.json
└── src/
    └── index.ts                 # Stub with JSDoc describing intended layers
```

## Package Structure (planned, from docs)

### Core (`packages/core/`)
```
src/
├── index.ts                     # Barrel exports
├── data/                        # L1: mdbase records, CRUD, frontmatter
├── state/                       # L2: State machine, store, gates
└── modules/                     # L3: Module system, hooks, findings
```

### CODA (`packages/coda/`)
```
src/
├── index.ts                     # Re-exports from pi/index.ts
├── tools/                       # L4: coda_* tool functions
├── forge/                       # L5: Design layer, greenfield scaffolding
├── workflow/                    # L6: Phase transitions, build loop
└── pi/                          # L7: Commands, hooks, Pi integration
```

## Key Locations

| Concern | File/Directory |
|---------|---------------|
| Architecture rules | `AGENTS.md` |
| Package overview | `README.md` |
| Version plan | `ROADMAP.md` |
| Canonical spec | `docs/coda-spec-v7.md` |
| Module design | `docs/module-gaps-and-onboarding.md` |
| MVP layer docs | `docs/v0.1/` |
| Core entry | `packages/core/src/index.ts` |
| CODA entry | `packages/coda/src/index.ts` |
| Pi settings | `.pi/settings.json` |

## Naming Conventions

- **Package directories:** lowercase nouns (`core`, `coda`, `muse`, `lens`, `helm`)
- **Entrypoints:** `index.ts`
- **Implementation files (planned):** kebab-case (`coda-create.ts`, `build-loop.ts`, `greenfield.ts`)
- **Docs:** kebab-case with numeric prefixes for ordered series (`01-data-layer.md`)
- **Module assets (planned):** lowercase domain names (`security.md`, `architecture.md`, `tdd.md`)

## Notable Gaps

- No `__tests__/` directories exist under any package
- No `main.ts` files exist — only `index.ts` entrypoints
- The richer folder structure from `docs/coda-spec-v7.md` is not yet created
- `modules/prompts/` and `modules/evals/` exist but are empty

---
*STRUCTURE.md — directory layout and organization*
