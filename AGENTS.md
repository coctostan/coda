# coda-ecosystem

## PALS Workflow

This project uses [PALS](https://github.com/coctostan/pals) — a project automation & lifecycle system.

- **Lifecycle:** PLAN → APPLY → UNIFY loop
- **State:** `.paul/STATE.md` tracks current position
- **Commands:** `/paul:plan`, `/paul:apply`, `/paul:unify`, `/paul:fix`
- **Git workflow:** none
- **Active modules:** carl, todd, walt, dean, iris, skip, dave, ruby, arch, seth, pete, gabe, luke, aria, dana, omar, reed, vera, docs, rev

## Boundaries

### Always Do
- Run tests before marking work complete
- Follow the PLAN → APPLY → UNIFY loop
- Check `.paul/STATE.md` for current project position before starting work

### Ask First
- Before modifying files outside the current plan scope
- Before adding new dependencies
- Before changing architecture patterns

### Never Do
- Commit secrets, API keys, or credentials
- Skip the UNIFY phase after APPLY
- Modify `.paul/` files directly — use `/paul:*` commands

## Project Conventions

### Architecture
- **Dependency direction:** core ← coda/muse/lens/helm. Never sideways between packages.
- **Within core:** L1 (data) ← L2 (state) ← L3 (modules). Imports flow downward only.
- **Within coda:** L4 (tools) ← L5 (forge) ← L6 (workflow) ← L7 (pi). Downward only.
- **`.coda/` is write-protected.** All modifications through coda_* tools, never direct file writes.
- **Module prompts are data.** They live in `modules/prompts/`, not in TypeScript.
- **Eval cases ship with prompts.** `modules/evals/{module}.json` for every prompt.

### Code Style
- TypeScript strict mode, no `any` types
- Pure functions where possible (especially in core)
- State mutations only through the state engine
- Every public function has a JSDoc comment
- File names: kebab-case for implementation, `index.ts` for entrypoints
- Variables/functions: camelCase; Types/interfaces: PascalCase; Tool names/fields: snake_case

### Testing
- Bun test runner
- TDD: write tests first, verify they fail, then implement
- Tests live alongside source in `__tests__/` directories

### Build Order
Build `core` first (M1-M3), then `coda` (M4-M7). MUSE, LENS, HELM come after CODA is functional.

### Key Specs
- `docs/coda-spec-v7.md` — The canonical CODA specification
- `docs/module-gaps-and-onboarding.md` — FORGE, modules, ecosystem analysis
