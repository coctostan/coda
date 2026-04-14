# v0.5 — Compounding & Polish

**Goal:** CODA compounds knowledge across issues. Every completed issue makes the next one easier — through spec delta merges, module overlay evolution, knowledge capture, and configurable gate automation.

**Prerequisite:** v0.7 complete (brownfield FORGE, context features, adaptive ceremony).

## What v0.5 Adds

1. **Full UNIFY runner** — merge spec deltas, update reference docs, write completion records, advance milestones, fire post-unify hooks
2. **Per-project module overlays (.local.md)** — modules evolve per-project via validated patterns, false positives, and project values
3. **Gate automation** — configurable human/auto/auto-unless-block per gate, per issue type
4. **Prompt eval infrastructure** — TDD for prompts: eval cases, scoring, iteration
5. **Session management** — /coda pause and /coda resume with handoff artifacts

## What v0.5 Does NOT Add

- New modules beyond the existing 5 (debt, state, errors → v0.6+)
- Multi-issue coordination (v1+)
- Additive/transformative FORGE (v0.8/v0.9)
- FORGE completeness gate (v0.12)

## Architecture

UNIFY runner extends the workflow layer:

```
packages/coda/src/workflow/
├── unify-runner.ts       # NEW: UNIFY compounding orchestration
├── phase-runner.ts       # MODIFY: wire unify-runner into unify case
├── ceremony.ts           # MODIFY: surface ceremony rules in config
└── module-integration.ts # MODIFY: fire post-unify hooks
```

Module overlays extend the module system:

```
packages/core/src/modules/
├── overlay.ts            # NEW: load + merge default + .local.md prompts
├── dispatcher.ts         # MODIFY: use overlay-merged prompts
└── registry.ts           # (no changes needed)

.coda/modules/
├── security.local.md     # Per-project overlay (created by UNIFY/human feedback)
├── tdd.local.md
└── ...
```

Gate automation extends config:

```
packages/coda/src/forge/
├── types.ts              # MODIFY: add gate automation config
└── scaffold.ts           # MODIFY: default gate config in scaffold
```

Prompt eval is a new standalone utility:

```
packages/coda/src/eval/
├── runner.ts             # NEW: run prompts against eval cases
├── scorer.ts             # NEW: score findings against expected
├── types.ts              # NEW: EvalCase, EvalResult
└── index.ts
```

## Build Order

| Phase | What | Effort | Depends On |
|-------|------|--------|-----------|
| 1 | Full UNIFY runner — spec delta merge, ref doc updates, completion record | 2 hr | — |
| 2 | Post-UNIFY hook execution + knowledge capture wiring | 1 hr | Phase 1 |
| 3 | Per-project module overlays (.local.md) — load, merge, persist | 1.5 hr | — |
| 4 | Human feedback loop — false positive capture → overlay update | 1 hr | Phase 3 |
| 5 | Gate automation config + enforcement | 1.5 hr | Phase 1 |
| 6 | Prompt eval runner + scorer | 2 hr | Phase 3 |
| 7 | /coda pause + /coda resume | 1 hr | — |
| 8 | Wire ceremony rules into CodaConfig | 30 min | Phase 5 |
| 9 | E2E: compounding loop validation (2 issues, ref doc evolves) | 1.5 hr | All |

**Total estimated: ~12 hours**

## Key Design Decisions

1. **UNIFY is disk-driven and restartable.** Reads all state from .coda/ artifacts, not conversation history.
2. **Module overlays are additive, not destructive.** .local.md extends the default prompt; it never replaces it.
3. **Gate automation defaults to human.** Auto modes must be explicitly opted into via coda.json.
4. **Prompt eval is separable.** Designed as a standalone utility that happens to ship inside @coda/coda but could be extracted.
5. **Pause/resume uses disk artifacts.** No session state capture needed — .coda/handoff.md + state.json provide full continuity.

## Spec Files

- `01-unify-runner.md` — Full UNIFY compounding
- `02-module-overlays.md` — Per-project .local.md overlay system
- `03-gate-automation.md` — Configurable gate modes
- `04-prompt-eval.md` — TDD for prompts
- `05-session-management.md` — /coda pause and /coda resume
- `E2E-TEST-SCRIPT-v0.5.md` — Compounding loop validation
