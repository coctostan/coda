# Phase 49 Summary: Module Overlay Infrastructure

## Outcome
✅ Complete — Two-layer module prompt model shipped with overlay-aware dispatcher, UNIFY compounding, and FORGE seeding.

## What Was Built

### Core Overlay Module (`packages/core/src/modules/overlay.ts`) — NEW
- `OverlaySection`, `OverlayFrontmatter`, `OverlayData` types
- `readOverlay()` — reads `.coda/modules/{module}.local.md` with YAML frontmatter + 4 section parser
- `writeOverlay()` — writes overlay files, creates `modules/` directory as needed
- `appendToOverlay()` — creates or appends to overlay, updates frontmatter timestamp/author
- `loadMergedPrompt()` — reads default prompt + overlay, returns merged result with `## Project-Specific Context` header
- `formatOverlayBody()` — renders overlay sections to markdown
- Zero external dependencies (L3 constraint satisfied)

### Dispatcher Integration (`packages/core/src/modules/dispatcher.ts`) — MODIFIED
- `createDispatcher(registry, codaRoot?)` now accepts optional `codaRoot`
- When `codaRoot` provided: uses `loadMergedPrompt()` for overlay-merged prompt loading
- When `codaRoot` omitted: unchanged behavior (backward compatible)

### Module Integration (`packages/coda/src/workflow/module-integration.ts`) — MODIFIED
- `createModuleSystem()` passes `codaRoot` through to `createDispatcher()`
- `getModulePromptForHook()` threads `codaRoot` to the dispatcher for overlay merge

### UNIFY Compounding (`packages/coda/src/workflow/unify-runner.ts`) — MODIFIED
- Added ACTION 3b instruction in UNIFY system prompt
- Instructs agent to record learned patterns in `.coda/modules/{module}.local.md` overlays
- Covers all 4 overlay sections: Project Values, Validated Patterns, Known False Positives, Recurring Issues
- Uses `coda_edit_body` for writes (consistent with Decision D3)

### FORGE Seeding (`packages/coda/src/forge/brownfield.ts`) — MODIFIED
- `SynthesizeContext` gains `overlayInstructions` field
- `assembleSynthesizeContext()` generates overlay seeding instructions from discovered evidence modules
- Instructions guide agent to create initial overlays with Project Values and Validated Patterns

### Core Re-exports (`packages/core/src/modules/index.ts`) — MODIFIED
- Re-exports all overlay types and functions

## Tests
- 13 new unit tests in `packages/core/src/modules/__tests__/overlay.test.ts`
- 5 new integration tests in `packages/coda/src/workflow/__tests__/overlay-integration.test.ts`
- **626 total tests passing** (608 original + 18 new), 0 failures
- TypeScript strict clean

## Decisions
| Decision | Rationale |
|----------|-----------|
| Overlay merge is append-only | Keep deterministic; default prompt + `## Project-Specific Context` + overlay body |
| Agent writes overlays via `coda_edit_body` | Consistent with v0.8 D3; no new tool needed |
| Single overlay file per module (not per-hook) | Matches coda-spec-v7 design; keeps file count manageable |
| Overlay seeded during FORGE SYNTHESIZE | Evidence is already collected; natural injection point |
| UNIFY compounding via ACTION 3b | Extends existing 5-action model without disrupting it |

## Files Changed
| File | Change |
|------|--------|
| `packages/core/src/modules/overlay.ts` | NEW — core overlay CRUD + merge |
| `packages/core/src/modules/__tests__/overlay.test.ts` | NEW — 13 unit tests |
| `packages/coda/src/workflow/__tests__/overlay-integration.test.ts` | NEW — 5 integration tests |
| `packages/core/src/modules/dispatcher.ts` | MODIFIED — overlay-aware prompt loading |
| `packages/core/src/modules/index.ts` | MODIFIED — re-exports |
| `packages/coda/src/workflow/module-integration.ts` | MODIFIED — codaRoot threading |
| `packages/coda/src/workflow/unify-runner.ts` | MODIFIED — ACTION 3b |
| `packages/coda/src/forge/brownfield.ts` | MODIFIED — overlay seeding |
