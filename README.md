# CODA Ecosystem

**Compounding Orchestrated Development Architecture** — and friends.

A suite of Pi extensions for disciplined, agent-assisted software development.

## The Suite

| Tool | Full Name | Purpose | Status |
|------|-----------|---------|--------|
| **CODA** | Compounding Orchestrated Development Architecture | Project lifecycle — FORGE design + issue execution | 🔴 Active development |
| **MUSE** | Modular Unstructured Scoping Engine | Ideation & incubation — pre-project thinking | 🟡 Stubbed |
| **LENS** | Layered Epistemic aNalysis System | Deep multi-domain codebase audit | 🟡 Stubbed |
| **HELM** | Holistic Engineering Lifecycle Management | Multi-project workspace & operator layer | ⚪ Planned (post-v1) |

## The Flow

```
HELM (see all your projects)
  └── MUSE (incubate an idea)
        └── CODA (formalize and build)
              ├── FORGE (design phases)
              ├── Issue lifecycle (SPECIFY → BUILD → VERIFY → UNIFY)
              └── LENS (deep audit when needed)
```

## Per-Workspace Enablement

Each workspace enables the tools it needs:

```
thinkingSpace/    → MUSE enabled, HELM enabled
coda/          → CODA enabled (building this very project)
my-web-app/       → CODA enabled, LENS enabled
```

## Architecture

```
coda/
├── packages/
│   ├── core/          # Shared: data layer, module system, eval engine, state
│   ├── coda/          # Pi extension: FORGE + lifecycle engine
│   ├── muse/          # Pi extension: ideation & incubation
│   ├── lens/          # Pi extension: deep multi-domain audit
│   └── helm/          # Pi extension: multi-project workspace (post-v1)
├── modules/           # Shared module prompts + evals (used by CODA and LENS)
│   ├── prompts/       # Default module prompts
│   └── evals/         # Module eval cases for prompt development
└── docs/              # Design docs, specs, architecture decisions
```

## Shared Core (`packages/core/`)

All tools depend on the shared core:

- **Data Layer** — mdbase wrapper, type schemas, section reader, query helpers
- **State Engine** — state machine, atomic JSON persist, gates, transitions
- **Module System** — registry, dispatcher, finding schema, prompt eval engine
- **Types** — shared TypeScript types across all packages

## Design Principles

1. **The spec is the source of truth.** Code is derivative. `ref-system.md` is the product.
2. **Mechanize the skeleton, instruct the substance.** Process is mechanical. Analysis is LLM judgment with structured evidence.
3. **Modules are domain experts.** 25 modules across core, domain, and specialist categories. Each produces structured findings with assumptions.
4. **FORGE is the design layer.** Greenfield, brownfield, additive, transformative — one process, four backdrops.
5. **Compound everything.** Every completed issue makes the next one easier. Per-project module overlays, pattern accumulation, living spec.
6. **Tools integrate at defined handoff points.** MUSE → CODA via FORGE. LENS → CODA via gap analysis and audit. HELM → CODA via project registry.
7. **Stock Pi.** Public SDK APIs only. Portable data layer.

## Build Order
See `ROADMAP.md` for the full versioned plan. Summary:

```
v0.1  MVP — thin slice through all layers, one issue lifecycle on test project
v0.2  Autonomous loops — review/revise, verify/correct
v0.3  Module system — 5 core modules with structured findings
v0.4  Brownfield + context — onboard existing codebases, smart context management
v0.5  Compounding — UNIFY that learns, module overlays, gate automation
v0.6+ Extended features — remaining modules, FORGE variants, risk metadata
v1.0  Production-ready
```

### Phase 2: MUSE (ideation)
```
M8: MUSE Core          — project types, conversation guides, planning templates
M9: MUSE Pi Extension  — commands, quality checklist, CODA handoff
```

### Phase 3: LENS (audit)
```
M10: LENS Core         — multi-domain audit engine, epistemic schema, adversarial review
M11: LENS Pi Extension — commands, CODA integration (gap analysis + audit import)
```

### Phase 4: HELM (workspace)
```
M12: HELM Core         — project registry, operator profile, cross-project analytics
M13: HELM Pi Extension — commands, dashboard, CODA satellite registration
```

## Spec References

- `docs/coda-spec-v7.md` — The canonical CODA specification (1,918 lines)
- `docs/module-gaps-and-onboarding.md` — Module system, FORGE design, ecosystem analysis
