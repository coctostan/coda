# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-04-01)
Version: v0.2.0

**Core value:** Enabling developers to build durable, maintainable software through disciplined agent-assisted workflows
**Current focus:** Milestone v0.2 complete — ready for next milestone.

## Current Position
Milestone: Awaiting next milestone
Phase: None active
Plan: None
Status: Milestone v0.2 Autonomous Loops complete — ready for next
Last activity: 2026-04-01T17:13:25Z — Milestone completed
Progress:
- v0.2 Autonomous Loops: [██████████] 100% ✓

## Loop Position
Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ○        ○        ○     [Milestone complete - ready for next]
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
Branch: main
Remote: https://github.com/coctostan/coda.git

## Session Continuity

Last session: 2026-04-01T17:13:25Z
Stopped at: Milestone v0.2 Autonomous Loops complete
Next action: /paul:discuss-milestone or /paul:milestone
Resume file: .paul/MILESTONES.md

---
*STATE.md — Updated after every significant action*
