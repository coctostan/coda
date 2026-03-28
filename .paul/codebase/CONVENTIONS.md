# Coding Conventions

*Generated: 2026-03-28*

## Code Style

Inferred from `tsconfig.json`, doc examples, and existing stubs:

- **Indentation:** 2 spaces
- **Semicolons:** Yes (consistent in doc examples)
- **Quotes:** Not enforced by tooling (doc examples use both single and double)
- **TypeScript strict mode:** Enabled (`tsconfig.json`)
- **No `any` types:** Required by `AGENTS.md`
- **Pure functions preferred:** Especially in core (`AGENTS.md`)

### Tooling

- No `.eslintrc`, `.prettierrc`, `.editorconfig`, or `bunfig.toml` found
- Style is convention-based, not tooling-enforced

## Naming Conventions

### Files & Directories
- Package directories: lowercase nouns (`core`, `coda`)
- Implementation files: kebab-case (`coda-create.ts`, `build-loop.ts`) — from docs
- Entrypoints: `index.ts`
- Test files: `*.test.ts`, `*.spec.ts`, or `__tests__/` — from docs

### Symbols
- **Types / Interfaces:** PascalCase (`IssueRecord`, `CodaState`, `GateCheckData`, `PhaseContext`)
- **Functions / Variables:** camelCase (`readRecord`, `writeRecord`, `getPhaseContext`, `runBuildLoop`)
- **Tool names / Record fields:** snake_case (`focus_issue`, `current_task`, `last_test_exit_code`)

## Patterns

### Export Patterns
- **Barrel re-exports** at package roots: `export * from './data'` (planned in `packages/core/src/index.ts`)
- **Default export** for Pi extension entry: `export default function(pi: PiAPI)` (from `docs/v0.1/07-pi-integration.md`)
- **Named exports** elsewhere

### Import Direction
Strict downward-only imports (`AGENTS.md`):
- Core: `data` → `state` → `modules`
- CODA: `tools` → `forge` → `workflow` → `pi`
- Extensions depend on `@coda/core`, never the reverse
- No sideways imports between extension packages

### State Mutations
- Only through the state engine (never direct mutation)
- State writes are atomic (`.tmp` + rename)
- `.coda/` directory write-protected — modifications only through `coda_*` tools

## Documentation Style

- **JSDoc required** for every public function (`AGENTS.md`)
- Top-of-file module docblocks used in current stubs (`packages/*/src/index.ts`)
- Specs and design docs use Markdown with headings, tables, bullets, and fenced code blocks
- Module prompts are data files in `modules/prompts/`, not embedded in TypeScript

## Brownfield Quick Start — Style Rules for New Code

1. **File names:** lowercase/kebab-case for implementation, `index.ts` for entrypoints
2. **Variables/functions:** camelCase
3. **Types/interfaces:** PascalCase
4. **Tool names/fields:** snake_case for external-facing identifiers
5. **Imports:** downward-only across layers; core below extensions
6. **Exports:** barrel re-exports at package roots, default export for Pi entry
7. **Comments:** JSDoc for public functions, module docblocks at file top
8. **Tests:** `*.test.ts` in `__tests__/` directories
9. **No `any`:** TypeScript strict mode, no type escape hatches
10. **Pure functions:** Prefer pure functions, especially in core

---
*CONVENTIONS.md — code style and patterns*
