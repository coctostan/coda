# v0.4 — Brownfield & Context

**Goal:** Can onboard an existing codebase via brownfield FORGE. Context management is smart — topic-based retrieval, dependency-based carry-forward, module finding summarization, context budgets.

**Prerequisite:** v0.3.1 complete (VCS integration, coda_query, module cleanup).

## What v0.4 Adds

1. **Brownfield FORGE** — SCAN → SYNTHESIZE → GAP ANALYSIS → VALIDATE → ORIENT flow
2. **Module init-scan hooks** — each module scans its domain during brownfield FORGE
3. **Gap analysis** — module-driven assessment with dependency-aware ordering
4. **Topic-based section retrieval** — inject only matching sections from large ref docs
5. **Dependency-based carry-forward** — BUILD tasks get context from their dependency tasks, not just recency
6. **Adaptive ceremony** — issue types get different phase depths (features vs bugfixes vs chores)
7. **Context budget management** — per-phase context limits, module finding summarization

## What v0.4 Does NOT Add

- Per-project module overlays (.local.md) (v0.5)
- Gate automation (v0.5)
- Additive/transformative FORGE (v0.8/v0.9)
- FORGE completeness gate (v0.12)

## Architecture

Brownfield FORGE extends the existing forge module:

```
packages/coda/src/forge/
├── greenfield.ts        # Existing
├── brownfield.ts        # NEW: SCAN → SYNTHESIZE → GAP → VALIDATE → ORIENT
├── evidence.ts          # NEW: evidence file management (.coda/forge/initial/onboarding/)
├── gap-analysis.ts      # NEW: module-driven gap assessment
├── scaffold.ts          # Existing (shared between greenfield and brownfield)
├── types.ts             # MODIFY: add brownfield types
└── index.ts             # MODIFY: detect backdrop, route to greenfield or brownfield
```

Context management improves existing modules:

```
packages/core/src/data/
├── sections.ts          # MODIFY: topic-based section retrieval
├── query-helpers.ts     # NEW: by-topic, by-issue, cross-type queries

packages/coda/src/workflow/
├── context-builder.ts   # MODIFY: topic matching, dependency carry-forward, budgets
├── ceremony.ts          # NEW: adaptive ceremony rules per issue type
```

## Build Order

| Phase | What | Effort | Depends On |
|-------|------|--------|-----------|
| 1 | Topic-based section retrieval in data layer | 1 hr | — |
| 2 | Dependency-based carry-forward in context builder | 1 hr | — |
| 3 | Adaptive ceremony rules | 1.5 hr | — |
| 4 | Context budget management | 1 hr | Phases 1-2 |
| 5 | Module init-scan hook point + dispatch | 1 hr | v0.3 module system |
| 6 | Brownfield SCAN (module-driven evidence gathering) | 2 hr | Phase 5 |
| 7 | Brownfield SYNTHESIZE (build ref docs from evidence) | 1.5 hr | Phase 6 |
| 8 | Brownfield GAP ANALYSIS (module-driven assessment) | 2 hr | Phase 7 |
| 9 | Brownfield VALIDATE + ORIENT (human review + future direction) | 1 hr | Phase 8 |
| 10 | Wire brownfield into `/coda forge` command | 30 min | Phases 6-9 |
| 11 | E2E: brownfield forge on a real open-source project | 1 hr | All |

**Total estimated: ~13 hours**

## Key Design Decisions

1. **Brownfield FORGE reuses the module system.** Each module's `init-scan` hook is just another hook point. No new infrastructure — the dispatcher handles it.
2. **Evidence files are markdown with frontmatter.** Same format as all other .coda/ records. Stored in `.coda/forge/initial/onboarding/EVIDENCE-{module}.md`.
3. **Gap analysis orders by dependency, not severity.** You can't fix auth if the config system is broken. Dependency-aware ordering from the AEGIS-inspired design.
4. **Optional LENS escalation during gap analysis.** If LENS (deep audit) is installed, CODA offers to invoke it for more thorough analysis.
5. **Adaptive ceremony is config-driven.** Rules per issue type in `ceremony.ts`, not hardcoded per-phase logic. Config in `coda.json` can override defaults.
6. **Context budgets are advisory, not hard limits.** The context builder targets a budget per phase but doesn't truncate mid-section. It omits lower-priority sections to stay within budget.

## Spec Files

- `01-topic-retrieval.md` — Topic-based section retrieval
- `02-carry-forward.md` — Dependency-based BUILD context
- `03-ceremony.md` — Adaptive ceremony rules per issue type
- `04-context-budgets.md` — Per-phase context budget management
- `05-brownfield-forge.md` — The full brownfield flow (SCAN → GAP → VALIDATE → ORIENT)
- `E2E-TEST-SCRIPT-v0.4.md` — Brownfield forge on a real OSS project
