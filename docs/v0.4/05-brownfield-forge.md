# v0.4: Brownfield FORGE

**Package:** `coda` → `src/forge/brownfield.ts` (NEW)
**Depends on:** v0.3 module system, v0.4 topic retrieval, context budgets

## Purpose

`/coda forge` on a project with existing code but no `.coda/`. Reverse-engineers the system spec from code evidence.

## Detection

```typescript
// In forge/index.ts:
function detectBackdrop(projectRoot: string): 'greenfield' | 'brownfield' | 'existing' {
  if (existsSync(join(projectRoot, '.coda'))) return 'existing';
  
  // Check for code indicators
  const codeIndicators = [
    'package.json', 'Cargo.toml', 'go.mod', 'pyproject.toml',
    'pom.xml', 'Gemfile', 'composer.json'
  ];
  const hasCode = codeIndicators.some(f => existsSync(join(projectRoot, f)));
  const hasSrcDir = ['src', 'lib', 'app', 'cmd', 'pkg'].some(
    d => existsSync(join(projectRoot, d))
  );
  
  return (hasCode || hasSrcDir) ? 'brownfield' : 'greenfield';
}
```

## The 5 Phases

### Phase 1: SCAN (Module-Driven Evidence Gathering)

Each enabled module with an `init-scan` hook runs its domain scan. The dispatcher assembles scan prompts and the agent produces evidence.

**Universal targets (always read, regardless of modules):**

```typescript
const UNIVERSAL_SCAN_TARGETS = [
  'README.md',
  'CONTRIBUTING.md', 'AGENTS.md', 'CLAUDE.md',
  'package.json', 'Cargo.toml', 'go.mod', 'pyproject.toml',
];

const UNIVERSAL_COMMANDS = [
  'git log --oneline -20',
  'find src -type f | head -50',   // or lib, app, etc.
  'ls -la',
];
```

**Module scan prompts:** Each module's `init-scan` prompt tells the agent what to look for in its domain. The agent reads files, runs commands, and produces an evidence report.

**Evidence output:** One file per module in `.coda/forge/initial/onboarding/`:

```
.coda/forge/initial/onboarding/
├── EVIDENCE-universal.md          # README, package.json, git log, directory structure
├── EVIDENCE-architecture.md       # Layer patterns, entry points, module boundaries
├── EVIDENCE-security.md           # Auth patterns, validation, secret management
├── EVIDENCE-api.md                # Routes, endpoints, OpenAPI specs
├── EVIDENCE-data.md               # Schemas, ORM, migrations
├── EVIDENCE-quality.md            # Test framework, coverage, lint config
├── EVIDENCE-deps.md               # Dependencies, vulnerabilities, build tools
└── EVIDENCE-docs.md               # Documentation catalog, freshness
```

Each evidence file has frontmatter:
```yaml
---
module: security
scanned_at: 2026-04-03T10:00:00Z
files_read: [src/middleware/auth.ts, src/routes/login.ts, .env.example]
commands_run: [grep -r "password" src/]
---
```

### Phase 2: SYNTHESIZE (Build Ref Docs from Evidence)

The agent reads ALL evidence files and produces reference docs:

- **ref-system.md** — capabilities assembled from API evidence, data evidence, integration evidence. Structured by capability, not by module.
- **ref-architecture.md** — from architecture + deps + data evidence. Patterns, layers, data flow.
- **ref-conventions.md** — from quality + security evidence. Testing patterns, code style, security practices.
- **ref-prd.md** — from README + universal evidence + agent's synthesis. Why it exists, who uses it.

These are draft docs — the agent writes them via `coda_create` and `coda_edit_body`.

### Phase 3: GAP ANALYSIS (Module-Driven Assessment)

After synthesizing, each module runs a gap assessment — not "what exists" but "what's missing, broken, risky."

The dispatcher runs `init-scan` hooks a second time with a different prompt variant (gap analysis mode). Or this could be a separate hook point: `init-gap`.

**Gap analysis produces:** `.coda/forge/initial/GAP-ANALYSIS.md`

```markdown
---
title: Gap Analysis
generated_at: 2026-04-03T10:15:00Z
---

## Summary Dashboard
| Domain | Verdict | Critical Gaps | Recommendations |
|--------|---------|---------------|----------------|
| Architecture | Debt-carrying | 2 circular deps | Refactor auth module |
| Security | Concerning | 5 unprotected endpoints | Add auth sweep |
| Quality | Weak | 40% test coverage | Add CI first |
| ...

## Priority Issues (dependency-ordered)
1. [Critical] No CI pipeline — quality regression risk
2. [Critical] 5 unprotected endpoints — security risk
3. [High] Auth module is 800 lines — change risk
...

## Recommended First Actions
1. Add CI pipeline (unblocks quality tracking)
2. Secure unprotected endpoints (highest risk)
3. Split auth module (highest change frequency)
```

**Dependency-aware ordering:** Recommendations are ordered by dependency, not just severity. "Add CI" comes before "increase test coverage" because coverage depends on CI.

### Phase 4: VALIDATE (Human Reviews)

The agent presents the synthesized docs and gap analysis to the human for structured review:

1. **Capabilities:** "I found N capabilities. Missing any? Wrong ones?"
2. **Gap priorities:** "Here are the critical gaps ranked. Agree with the order?"
3. **Security posture:** "Here's the security assessment. Compliance requirements?"
4. **Growth constraints:** "Flexibility assessment. Planned changes that make anything urgent?"

This is conversational — the agent asks, the human corrects, the agent revises.

### Phase 5: ORIENT (Future Direction)

Only after today is documented:

1. "Where do you want to take this?"
2. "Biggest pain point or opportunity?"
3. "What should we NOT change?" (stability boundaries)
4. "What are the roadmap priorities?"

Produces milestones and updates `ref-roadmap.md`.

## Forge Artifacts

```
.coda/forge/initial/
├── target-system.md                  # What ref-system.md should look like (= ref-system.md itself for brownfield)
├── GAP-ANALYSIS.md                   # Module-driven gap assessment
├── MILESTONE-PLAN.md                 # First milestones from ORIENT phase
└── onboarding/                       # Evidence trail
    ├── EVIDENCE-universal.md
    ├── EVIDENCE-architecture.md
    ├── EVIDENCE-security.md
    └── ...
```

## Module init-scan Prompts

New prompt files needed for each module's `init-scan` hook:

```
modules/prompts/
├── security/
│   ├── init-scan.md       # NEW: what to look for during brownfield scan
│   ├── pre-plan.md
│   └── post-build.md
├── architecture/
│   ├── init-scan.md       # NEW
│   ├── pre-plan.md
│   └── post-build.md
├── tdd/
│   ├── init-scan.md       # NEW: detect test framework, patterns
│   ├── pre-build.md
│   ├── post-task.md
│   └── post-build.md
├── quality/
│   ├── init-scan.md       # NEW: detect lint, typecheck, CI
│   ├── pre-build.md
│   ├── post-build.md
│   └── post-unify.md
└── knowledge/
    ├── init-scan.md       # NEW: detect existing docs, decisions
    ├── post-build.md
    └── post-unify.md
```

**5 new init-scan prompts** across existing modules.

## Files

```
packages/coda/src/forge/
├── brownfield.ts        # NEW: the 5-phase flow
├── evidence.ts          # NEW: evidence file read/write
├── gap-analysis.ts      # NEW: gap assessment orchestration
├── types.ts             # MODIFY: add brownfield types
└── index.ts             # MODIFY: detect backdrop, route brownfield
```

## Tests

1. detectBackdrop returns 'brownfield' for project with package.json + src/
2. detectBackdrop returns 'greenfield' for empty project
3. Evidence files written with correct frontmatter
4. SYNTHESIZE produces ref docs from evidence
5. GAP-ANALYSIS.md has summary dashboard and priority issues
6. Priority issues are dependency-ordered (not just severity)
7. VALIDATE flow accepts human corrections
8. ORIENT produces milestones

## E2E Test

Point CODA at a real open-source project (e.g., a small Express app or a public GitHub repo). Does brownfield FORGE produce:
- Accurate ref-system.md (capabilities match what the project actually does)?
- Reasonable gap analysis (identifies real issues)?
- Useful first milestones?

See `E2E-TEST-SCRIPT-v0.4.md` for the full script.
