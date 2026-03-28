# Concerns & Technical Debt

*Generated: 2026-03-28*

## Summary

This is a spec-first monorepo in early scaffolding stage. The primary concern is the gap between extensive specification and minimal implementation. No security, performance, or complexity issues exist because there is no runtime code yet.

## Technical Debt

### Implementation Absence
All five package entrypoints are comment-only stubs:
- `packages/core/src/index.ts` — Core exports commented out
- `packages/coda/src/index.ts` — No extension entrypoint
- `packages/muse/src/index.ts` — Placeholder only
- `packages/lens/src/index.ts` — Placeholder only
- `packages/helm/src/index.ts` — Placeholder only

**Impact:** No functional code to test, validate, or ship.

### Spec/Code Drift Risk
`docs/coda-spec-v7.md` (1900+ lines) and `docs/module-gaps-and-onboarding.md` (900+ lines) describe a much more complete system than exists in code.

**Impact:** High drift risk as implementation begins. Need an explicit "implemented vs planned" tracking mechanism.

### Empty Asset Directories
`modules/prompts/` and `modules/evals/` are referenced in `AGENTS.md`, `README.md`, and `docs/coda-spec-v7.md` but contain no files.

**Impact:** Module system described in spec cannot run.

## Issues

### No Tests
`package.json` defines `bun test` but there are no test files anywhere under `packages/`. The test command is effectively a no-op.

**Impact:** TDD philosophy from `AGENTS.md` has no enforcement yet.

### No Build/Typecheck Script
`tsconfig.json` is configured to emit declarations to `dist`, but `package.json` has no `build` or `typecheck` script.

**Impact:** TypeScript compilation is not part of any workflow.

### Loose Dependency Versioning
- `typescript: 5.8` pinned across packages (current is 6.0.2)
- `@types/bun: latest` — unpinned
- Pi peer dependencies all use `*` — `packages/coda/package.json`, `packages/muse/package.json`, `packages/lens/package.json`, `packages/helm/package.json`
- No lockfile committed

**Impact:** Reproducibility and compatibility are underspecified.

## Security

- No hardcoded secrets, `eval`, or unsafe operations found
- No `try/catch` blocks (no code to protect)
- Security controls are documented in specs but not implemented
- This reflects absence of code, not strong security posture

## Performance

- No runtime performance hotspots (no runtime code)
- Future concern: large spec docs may cause context bloat if loaded wholesale by tools

## Documentation

### README Overstates Maturity
`README.md` presents CODA as "active development" but `packages/coda/src/index.ts` is a placeholder.

### Missing Implemented-vs-Planned Map
Specs don't clearly mark which features are implemented. Hard to distinguish real from aspirational.

## Clean Scan Notes

- ✅ No `TODO`, `FIXME`, `HACK`, or `XXX` markers in TypeScript source
- ✅ No `any` types in TypeScript source
- ✅ No large or complex functions (stubs only)
- ✅ No duplicate logic patterns (yet)

---
*CONCERNS.md — technical debt and issues*
