# Codebase Reference Graph

*Generated: 2026-03-28*

## Overview

This is a scaffolded monorepo with 5 TypeScript stub files. There are no runtime `import` statements in source code, so the source-level reference graph is fully disconnected. The only cross-package links are manifest-level `package.json` dependencies.

## Hub Files

No hub files detected — all source files have 0 inbound references.

| File | Inbound Refs | Key Exports |
|------|-------------|-------------|
| `packages/core/src/index.ts` | 0 | none (exports commented out) |
| `packages/coda/src/index.ts` | 0 | none |
| `packages/muse/src/index.ts` | 0 | none |
| `packages/lens/src/index.ts` | 0 | none |
| `packages/helm/src/index.ts` | 0 | none |

**Predicted hub (from docs):** `packages/core/src/index.ts` will become the primary hub once it barrels L1–L3 exports.

## Entry Points

| File | Type | Description |
|------|------|-------------|
| `packages/core/src/index.ts` | Library barrel | Shared core surface (L1-L3) |
| `packages/coda/src/index.ts` | Extension entry | CODA Pi extension (L4-L7) |
| `packages/muse/src/index.ts` | Extension entry | MUSE ideation workflow |
| `packages/lens/src/index.ts` | Extension entry | LENS audit workflow |
| `packages/helm/src/index.ts` | Extension entry | HELM workspace operator |

## Cross-Package Dependencies (manifest-level)

```
packages/coda  ──→  @coda/core (workspace:*)
packages/muse  ──→  @coda/core (workspace:*)
packages/lens  ──→  @coda/core (workspace:*)
packages/helm  ──→  @coda/core (workspace:*)
```

No package declares a dependency on `coda`, `muse`, `lens`, or `helm`. Core is dependency-free from extensions.

## Reference Edges

No source-level import edges exist. All files have empty dependency lists:

- `packages/core/src/index.ts` → `[]`
- `packages/coda/src/index.ts` → `[]`
- `packages/muse/src/index.ts` → `[]`
- `packages/lens/src/index.ts` → `[]`
- `packages/helm/src/index.ts` → `[]`

### Planned Edges (from docs and commented code)

Core internal:
- `packages/core/src/index.ts` → `./data`, `./state`, `./modules` (commented out)

CODA internal:
- `packages/coda/src/index.ts` → `./tools`, `./forge`, `./workflow`, `./pi` (planned)

Cross-package:
- `packages/coda/src/tools/*.ts` → `@coda/core` (data + state layers)
- `packages/coda/src/workflow/*.ts` → `@coda/core` (state + modules)

## Clusters

No tightly coupled groups detected. The codebase is fully disconnected at the source level.

### Predicted Clusters (from architecture docs)
- **Core data cluster:** `data/`, `state/store.ts` (state depends on data for recovery)
- **CODA tool cluster:** `tools/coda-*.ts` (all tools share data/state access patterns)
- **Workflow cluster:** `workflow/build-loop.ts`, `workflow/phase-runner.ts`, `pi/index.ts`

---
*Reference graph built by Explore agent analysis of import/require statements.*
