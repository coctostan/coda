# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-04-01)
Version: v0.3.0

**Core value:** Enabling developers to build durable, maintainable software through disciplined agent-assisted workflows
**Current focus:** Milestone v0.3 Module System — Phases 18-20 complete (types + registry + dispatcher). Phase 21 planning complete.

## Current Position
Milestone: v0.3 Module System
Phase: 21 of 25 (Module Prompts — Security + TDD) — Planning
Plan: 21-01 created, awaiting approval
Status: PLAN created, ready for APPLY
Last activity: 2026-04-01T19:00:00Z — Created .paul/phases/21-module-prompts/21-01-PLAN.md

Progress:
- v0.3 Module System: [███░░░░░░░] 37%
- Phase 21: [░░░░░░░░░░] 0%

## Loop Position
Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ○        ○     [Plan created, awaiting approval]
```

## Accumulated Context
### Decisions
| Decision | Phase | Impact |
|----------|-------|--------|
| Manual YAML parser | Phase 1 | Zero external deps |
| Bun type hoisting workaround | Phase 1 | tsc compatibility |
| Zero internal deps for state engine | Phase 2 | Clean layer separation |
| GitHub repo coctostan/coda, github-flow | Phase 3 | auto_push + auto_pr |
| Spec alignment items closed | Phase 3 | TDD gate + atomic safety |
| Prompts as .md data loaded by TS | Phase 4 | Follows AGENTS.md convention |
| Replace `import.meta.dir` with `import.meta.url` | Phase 8 | jiti compatibility for Pi extension loading |
| Symlink `@coda/core` in node_modules | Phase 8 | jiti can't resolve Bun workspace deps |
| v0.2 specs are source of truth for autonomous loops | Phase 9 | Direct-requirements milestone from docs/v0.2 |
| Submodes remain phase-local, not top-level phases | Phase 9 | Preserves linear lifecycle while enabling bounded review/verify loops |
| Deterministic structural review writes durable revision artifacts | Phase 10 | Review/revise loop stays mechanical, auditable, and disk-backed |
| Deterministic verify failures become YAML artifacts and correction tasks | Phase 11 | Mechanical, auditable verify/correct loop without new dependencies |
| Human review state remains in existing plan frontmatter/body artifacts | Phase 12 | Durable human review without new storage layers |
| Exhausted loops preserve artifacts and require explicit human recovery | Phase 13 | Human recovery stays auditable and phase-correct |
| Pi-facing runtime metadata comes from workflow-owned phase context | Phase 14 | Keeps Pi integration thin and phase-correct |
| Pi hooks now trigger deterministic review/verify runners and queue revise/correct follow-up turns | Phase 16 | Restores the supported live operator path without changing core state-machine semantics |
| Optional frontmatter arrays normalized at the loadTasks() boundary | Fix | Single defense point protects all downstream runners |
| blockThreshold: FindingSeverity \| 'none' — clean type separation | v0.3 D1 | 'none' threshold for advisory-only modules without polluting severity enum |
| Dispatcher API: assemblePrompts() + parseAndCheckFindings() | v0.3 D2 | Two-method API, dispatcher never touches sessions, matches Decision #5 |
| Only 2 module definitions in v0.3 (security + tdd) | v0.3 D3 | No half-registered modules with missing prompt files |
| Old todd/walt deleted in single clean cut at workflow integration | v0.3 D4 | No period where both old and new systems coexist |
| Workflow stores post-build results, passes moduleBlockFindings to GateCheckData | v0.3 D5 | Gate system remains single authority for advancement |
| HOOK_POINTS + SEVERITY_VALUES as const arrays for runtime validation | Phase 18 | validateFinding needs runtime enum membership checks |
| HookContext uses string types for phase/submode, not L2 imports | Phase 20 | Avoids coupling dispatcher to state engine |
Branch: main
Remote: https://github.com/coctostan/coda.git

## Session Continuity

Last session: 2026-04-01T19:00:00Z
Stopped at: Plan 21-01 created
Next action: Review and approve plan, then run /paul:apply .paul/phases/21-module-prompts/21-01-PLAN.md
Resume file: .paul/phases/21-module-prompts/21-01-PLAN.md

---
*STATE.md — Updated after every significant action*
