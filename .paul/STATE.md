# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-03-30)
Version: v0.2.0

**Core value:** Enabling developers to build durable, maintainable software through disciplined agent-assisted workflows
**Current focus:** Phase 17 unified; live blocker documented. Fix needed before milestone can close.

## Current Position
Milestone: v0.2 Autonomous Loops
Phase: 17 of 17 (Repeat Live E2E Validation) — Complete
Plan: 17-01 unified
Status: Phase complete (with documented blocker); ready for fix
Last activity: 2026-04-01T16:05:38Z — Unified Phase 17, recorded WALT/SKIP/RUBY reports, documented the live review-trigger blocker
Progress:
- v0.2 Autonomous Loops: [█████████░] 94%
- Phase 17: [██████████] 100%

## Loop Position
Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ✓     [Loop complete — Phase 17 closed with documented blocker]
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
| Continued APPLY despite preflight branch drift | Phase 9 | Recovered by branching to `feature/09-state-submodes-loop-tracking` before postflight |
| Submodes remain phase-local, not top-level phases | Phase 9 | Preserves linear lifecycle while enabling bounded review/verify loops |
| Deterministic structural review writes durable revision artifacts | Phase 10 | Review/revise loop stays mechanical, auditable, and disk-backed |
| Deterministic verify failures become YAML artifacts and correction tasks | Phase 11 | Mechanical, auditable verify/correct loop without new dependencies |
| Human review state remains in existing plan frontmatter/body artifacts | Phase 12 | Durable human review without new storage layers |
| Exhausted loops preserve artifacts and require explicit human recovery | Phase 13 | Human recovery stays auditable and phase-correct |
| Pi-facing runtime metadata comes from workflow-owned phase context | Phase 14 | Keeps Pi integration thin and phase-correct |
| Split the live operator-trigger fix and the follow-up rerun into new Phases 16 and 17 | Phase 15 | Keeps Phase 15 as documented validation while preserving a clean follow-on plan boundary |
| Pi hooks now trigger deterministic review/verify runners and queue revise/correct follow-up turns | Phase 16 | Restores the supported live operator path without changing core state-machine semantics |
| Live review trigger crashes when a planned task omits `depends_on` | Phase 17 | Blocks the clean CMUX/Pi rerun until review-runner treats missing dependencies as `[]` |
Branch: feature/v0.2-autonomous-loops
Remote: https://github.com/coctostan/coda.git
PR: previous PR #8 merged; no active PR for current tip
Last commit: feat(16-live-operator-trigger-resolution): support live autonomous triggers

## Session Continuity

Last session: 2026-04-01T16:05:38Z
Stopped at: Phase 17 unified with documented live blocker
Next action: Run /paul:fix to guard `collectDependencyIssues()` against missing `depends_on`, add a regression test, and verify the fix
Resume file: .paul/phases/17-repeat-live-e2e-validation/17-01-SUMMARY.md
Resume context:
- Phase 17 is fully unified but the milestone remains open due to the live review-trigger crash
- The fix is a one-line guard (`task.depends_on ?? []`) in `packages/coda/src/workflow/review-runner.ts:193` plus a regression test
- After the fix, a follow-on live rerun is needed to close v0.2 on fully green evidence
- Branch is `feature/v0.2-autonomous-loops`, 1 commit ahead of `main`, no active PR

---
*STATE.md — Updated after every significant action*
