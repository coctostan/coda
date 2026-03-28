# Testing

*Generated: 2026-03-28*

## Framework

- **Bun test runner** — Configured in root `package.json` and all `packages/*/package.json`
- Scripts: `"test": "bun test"`, `"test:watch": "bun test --watch"`
- No additional test framework config (`vitest.config.ts`, `jest.config.ts` — none found)
- No `bunfig.toml` for custom test configuration

## Current State

**No test files exist yet.** The test runner is configured but there are no `*.test.ts`, `*.spec.ts`, or `__tests__/` directories under `packages/`.

## Planned Structure (from docs)

### Unit Tests
- Core data layer: `packages/core/src/data/__tests__/` — `docs/v0.1/01-data-layer.md`
- Core state engine: `packages/core/src/state/__tests__/machine.test.ts`, `store.test.ts`, `gates.test.ts` — `docs/v0.1/02-state-engine.md`
- Tool layer: Each tool tested with mocked L1/L2 dependencies — `docs/v0.1/03-tool-layer.md`
- Modules: Minimal tests (modules are string constants in v0.1) — `docs/v0.1/04-modules.md`

### Integration Tests
- Forge: Scaffold, idempotency, and defaults tests — `docs/v0.1/05-forge-greenfield.md`
- Workflow: Phase runner, build loop, context builder, VCS behavior — `docs/v0.1/06-workflow-engine.md`
- Pi integration: Commands, hooks, write-gate, build-loop sequencing — `docs/v0.1/07-pi-integration.md`

### E2E Tests
- Full lifecycle test milestone defined in `docs/v0.1/00-overview.md`
- Workflow integration tests in `tests/workflow/` — `docs/coda-spec-v7.md`

## Test Organization

| Type | Location | Description |
|------|----------|-------------|
| Unit | `packages/*/src/**/__tests__/*.test.ts` | Co-located with source |
| Integration | `tests/workflow/` | Cross-layer and workflow tests |
| E2E | TBD | Full lifecycle tests |

## Testing Philosophy

From `AGENTS.md` and docs:

- **TDD:** Write tests first, verify they fail, then implement
- **Write-gate:** Production writes blocked until a failing test exists (`docs/v0.1/03-tool-layer.md`)
- **Test file detection:** `*.test.*`, `*.spec.*`, `__tests__/**`, `test/**`
- **Todd module:** Enforces RED-GREEN TDD during BUILD phase
- **Walt module:** Runs full suite and verification commands after tasks

## Coverage

- No coverage configuration or thresholds defined yet
- Coverage is a documented practice (`docs/coda-spec-v7.md` quality module scans for it)
- To be enforced once implementation begins

## Tools

- **Runner:** Bun test
- **Linting:** Not configured (no ESLint)
- **Formatting:** Not configured (no Prettier)
- **Type checking:** `tsconfig.json` with `strict: true` (no build/typecheck script)

---
*TESTING.md — test structure and practices*
