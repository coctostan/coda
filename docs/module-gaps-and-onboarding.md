# CODA Module Gaps & Onboarding Design

**Date:** 2026-03-24
**Status:** Exploration — feeding into coda-spec-v7
**Context:** Comparing CODA v6 modules against PALS modules, identifying gaps, and designing proper greenfield/brownfield onboarding processes.

---

## Part 1: Module Gap Analysis

### PALS → CODA Module Mapping

| PALS Module | CODA Module | Coverage | Notes |
|-------------|-------------|----------|-------|
| arch | architecture | ✓ Good | PALS has richer onboarding heuristics (pattern recognition checklist). CODA should adopt. |
| aria | a11y | ✓ Good | Same domain. |
| dana | data | ✓ Good | Same domain. |
| dave | ci | ✓ Good | Same domain. |
| dean | deps | ✓ Good | Same domain. |
| docs | docs | ✓ Good | Same domain. |
| gabe | api | ✓ Good | Same domain. |
| iris | patterns | ✓ Good | Anti-pattern detection. |
| luke | ux | ✓ Good | UI component patterns. |
| omar | observability | ✓ Good | Same domain. |
| pete | perf | ✓ Good | Same domain. |
| reed | resilience | ✓ Good | Same domain. |
| ruby | **MISSING** | ✗ Gap | Tech debt detection and tracking. PALS has debt heuristics + post-unify debt history. |
| seth | security | ✓ Good | Same domain. |
| skip | knowledge | ✓ Good | Decision/knowledge capture. |
| todd | tdd | ✓ Good | Same domain. |
| vera | privacy | ✓ Good | Same domain. |
| walt | quality | ✓ Good | Test/lint/typecheck baseline. |

### Modules CODA Is Missing Entirely

#### 1. **debt** — Tech Debt Tracking
PALS' `ruby` module tracks debt across milestones. CODA has no equivalent. This matters for compounding — you need to know if debt is growing or shrinking.

**Proposed:**
- `init-scan`: Detect existing debt indicators (TODO/FIXME counts, files >500 lines, test gaps, deprecated API usage)
- `pre-plan`: Flag files in scope that have known debt markers
- `post-build`: Check if the issue increased or decreased debt
- `post-unify`: Update `.coda/debt-history.md` with debt delta (before vs after)

#### 2. **state** — State Management Patterns
Neither PALS nor CODA covers this. Frontend and backend state management is a major source of bugs and complexity.

**Proposed:**
- `init-scan`: Detect state management patterns (Redux, Zuex, Pinia, React Context, server state, session stores, caches)
- `pre-plan`: If files in scope touch state, inject state architecture context
- `post-build`: Check for state anti-patterns (prop drilling, global mutation, stale closures, missing state invalidation)

#### 3. **errors** — Error Handling Patterns
Neither system covers error handling holistically. 

**Proposed:**
- `init-scan`: Detect error handling strategy (error boundaries, try/catch patterns, error types, error reporting services)
- `pre-plan`: If files in scope handle errors, inject error handling conventions
- `post-build`: Check for swallowed errors, missing error boundaries, inconsistent error types, missing user-facing error messages

#### 4. **i18n** — Internationalization
Missing from both systems. Critical for products targeting multiple locales.

**Proposed:**
- `init-scan`: Detect i18n framework (react-intl, i18next, ICU, gettext), existing translation files
- `pre-plan`: If UI files in scope, flag hardcoded strings
- `post-build`: Check for new hardcoded user-facing strings, missing translation keys

#### 5. **config** — Configuration Management
Neither system tracks configuration patterns and drift.

**Proposed:**
- `init-scan`: Map config sources (env vars, config files, feature flags, secrets managers)
- `pre-plan`: If config-related files in scope, inject config architecture
- `post-build`: Check for hardcoded config values, missing env var documentation, config without defaults

#### 6. **integrations** — External Service Mapping
PALS' `map-codebase` produces an INTEGRATIONS.md, but there's no ongoing module for it. CODA has nothing.

**Proposed:**
- `init-scan`: Map all external service dependencies (databases, APIs consumed, message queues, caches, auth providers, payment processors, etc.)
- `pre-plan`: If issue touches integration points, inject integration context and contract expectations
- `post-build`: Check for missing error handling on external calls, missing timeouts, hardcoded URLs

#### 7. **migration** — Migration Safety
CODA's `data` module partially covers this, but migration is broader than databases — API versioning, schema evolution, feature flags for gradual rollouts, backward compatibility.

**Proposed:**
- `pre-plan`: If breaking changes detected, inject migration planning context
- `post-build`: Check for missing migration scripts, untested rollback paths, missing feature flags for staged rollout

---

## Part 2: The Real Gap — Onboarding as Structured Design

### The Problem

Both PALS and CODA treat onboarding as a conversation: "What are you building? Who's it for? What's the tech stack?" This works for capturing surface-level context but fails to:

1. **Ensure comprehensive coverage** — Easy to forget security, scalability, error handling, observability until it's too late
2. **Challenge assumptions** — The "will this inhibit future flexibility?" question never gets asked systematically
3. **Build the spec bottom-up** (brownfield) — Current process is "read some files, synthesize," not a rigorous reverse-engineering
4. **Facilitate actual design decisions** (greenfield) — Current process captures *intent* but doesn't guide *design*

PALS' 5-question interview captures identity, users, problem, scope, and constraints. That's a product brief. It's not a design process.

### What's Actually Needed

Two distinct, structured processes — one for each direction:

---

## Part 3: Brownfield Onboarding — Code-Up Reverse Engineering

### Philosophy

The goal is to build `ref-system.md` (the source of truth) from evidence, not from the human's memory of what the system does. The human *validates* — they don't *dictate*. The code is the authority for the current state.

### The Process: 5 Phases

```
Phase 1: SCAN → Raw evidence by domain
Phase 2: SYNTHESIZE → Structured capabilities inventory
Phase 3: GAP ANALYSIS → What's missing, what's broken, what's risky
Phase 4: VALIDATE → Human corrects and fills gaps  
Phase 5: ORIENT → Future direction + first milestone
```

### Phase 1: SCAN (Module-driven, parallel)

Each module runs its `init-scan` hook. But instead of ad-hoc scanning, each module follows a structured evidence-gathering protocol:

**Architecture Module — Structure Evidence:**
```
1. Directory tree (3 levels, dirs only)
2. File count per top-level directory
3. Entry points (index.*, main.*, app.*)
4. Import graph: for each entry point, trace 2 levels of imports
5. Layer detection: match directory patterns against known architectures
6. Module boundaries: identify clusters of tightly-coupled files
7. Output: EVIDENCE-architecture.md
```

**API Module — Capability Evidence:**
```
1. Route/endpoint scan (Express, FastAPI, Go handlers, etc.)
2. For each endpoint: method, path, handler file, middleware chain
3. OpenAPI/Swagger spec if it exists
4. GraphQL schema if it exists
5. WebSocket endpoints
6. CLI commands (if CLI tool)
7. Output: EVIDENCE-api.md (this is the raw capability list)
```

**Data Module — Persistence Evidence:**
```
1. Database connection config
2. Schema files / ORM models / migration history
3. Entity list with fields and relationships
4. Cache layers (Redis, in-memory)
5. File storage patterns
6. Output: EVIDENCE-data.md
```

**Integration Module — External Dependency Evidence:**
```
1. HTTP client usage (axios, fetch, node-fetch patterns)
2. SDK imports (AWS SDK, Stripe, SendGrid, etc.)
3. Environment variables referencing external services
4. Message queue connections
5. Third-party auth (OAuth, SAML, API key patterns)
6. Output: EVIDENCE-integrations.md
```

**Security Module — Security Posture Evidence:**
```
1. Auth middleware presence and coverage
2. Input validation patterns (Zod, Joi, etc.)
3. Secret management (env vars, vault references, hardcoded)
4. CORS configuration
5. Rate limiting
6. Output: EVIDENCE-security.md
```

**Quality Module — Quality Baseline Evidence:**
```
1. Test framework + runner
2. Test file count, location pattern
3. Coverage config (if present)
4. Lint config + rules
5. Typecheck config
6. CI pipeline steps
7. Run test suite, record baseline
8. Output: EVIDENCE-quality.md
```

**Deps Module — Dependency Evidence:**
```
1. Package manager + lock file
2. Production vs dev dependencies
3. Dependency audit (known vulnerabilities)
4. Monorepo structure (if applicable)
5. Build tool chain
6. Output: EVIDENCE-deps.md
```

**Docs Module — Documentation Evidence:**
```
1. README presence and recency
2. API documentation (generated or manual)
3. Architecture docs
4. Contributing guide
5. Changelog
6. Inline documentation density (JSDoc, docstrings)
7. Output: EVIDENCE-docs.md
```

All evidence files go in `.coda/onboarding/` — they're the audit trail.

### Phase 2: SYNTHESIZE (Agent assembles, structured)

The agent reads all evidence files and produces the reference docs:

**`ref-system.md` — Built from capabilities:**
```markdown
# System Specification

## Overview
[Synthesized from README + architecture evidence]

## Capabilities

### Authentication
- Login with email/password (POST /api/auth/login → src/routes/auth.ts)
- Session management via JWT (middleware in src/middleware/auth.ts)
- Password reset flow (POST /api/auth/reset → src/routes/auth.ts)
[Source: EVIDENCE-api.md, EVIDENCE-security.md]

### User Management
- CRUD operations on users (src/routes/users.ts)
- Role-based access: admin, user (src/models/user.ts)
[Source: EVIDENCE-api.md, EVIDENCE-data.md]

### Notifications
- Email via SendGrid (src/services/email.ts)
- In-app notifications stored in notifications table
[Source: EVIDENCE-integrations.md, EVIDENCE-data.md]

## Data Model
[Synthesized from EVIDENCE-data.md]

## External Dependencies
[Synthesized from EVIDENCE-integrations.md]

## Security Posture
[Synthesized from EVIDENCE-security.md]
```

**`ref-architecture.md` — Built from structure:**
```markdown
# Architecture

## Pattern: [Detected] (e.g., "3-Layer: routes → services → models")
[From EVIDENCE-architecture.md]

## Module Map
[Directory → responsibility mapping]

## Data Flow
[Request lifecycle: entry point → middleware → handler → service → data]

## Tech Stack
[From EVIDENCE-deps.md]

## Deployment
[From EVIDENCE-quality.md CI section]
```

**`ref-conventions.md` — Built from patterns:**
```markdown
# Conventions

## Code Patterns
[Detected naming, file structure, import ordering]

## Testing
[Framework, patterns, coverage expectations]

## Security Conventions
[Validation approach, auth patterns, secret management]

## Error Handling
[Detected patterns for try/catch, error types, boundaries]
```

### Phase 3: GAP ANALYSIS (Module-driven assessment)

After synthesizing the evidence into reference docs, each module runs a **gap analysis** — not just "what exists" but "what's missing, what's broken, what's risky."

The gap analysis produces a structured report: `.coda/onboarding/GAP-ANALYSIS.md`

**Architecture Module — Structural Health:**
```
1. Circular dependencies: trace import graph, flag cycles
2. God files: files >500 lines that touch multiple concerns
3. Layer violations: files that import across boundaries they shouldn't
4. Missing boundaries: clusters of tightly-coupled files without clear interfaces
5. Dead code: exported symbols with no importers
6. Verdict: structural health score (healthy / debt-carrying / fragile)
```

**Security Module — Security Gaps:**
```
1. Unprotected endpoints: routes without auth middleware
2. Missing validation: endpoints accepting input without schema validation
3. Secret hygiene: hardcoded secrets, .env in git, missing secret rotation
4. Dependency vulnerabilities: CVEs in dependency tree
5. Missing security headers: CORS, CSP, HSTS
6. Verdict: security posture (strong / adequate / concerning / critical)
```

**Quality Module — Quality Gaps:**
```
1. Test coverage: which modules have tests, which don't
2. Test quality: are tests testing behavior or implementation?
3. Lint compliance: how clean is the codebase against its own rules?
4. Type safety: any/unknown usage, missing type annotations
5. CI gaps: what's tested in CI vs what isn't
6. Verdict: quality posture (strong / adequate / weak)
```

**Data Module — Data Health:**
```
1. Migration state: pending migrations, schema drift from models
2. Missing indexes: queries without supporting indexes (if detectable)
3. Orphaned relationships: foreign keys pointing to nothing
4. Missing constraints: fields that should be NOT NULL but aren't
5. Verdict: data health (healthy / drifting / concerning)
```

**API Module — Contract Health:**
```
1. Undocumented endpoints: routes without OpenAPI/schema coverage
2. Inconsistent patterns: mixed naming conventions, inconsistent error formats
3. Missing versioning: endpoints without version prefix on a mature API
4. Breaking change risk: heavily-consumed endpoints with no contract tests
5. Verdict: contract health (documented / partial / undocumented)
```

**Deps Module — Dependency Health:**
```
1. Outdated: major version behind
2. Vulnerable: known CVEs
3. Abandoned: packages with no updates in 2+ years
4. Duplicated: multiple packages solving the same problem
5. Verdict: dependency health (current / aging / risky)
```

**Debt Module — Technical Debt Inventory:**
```
1. TODO/FIXME/HACK count by file
2. Files with highest churn (git log) — frequent changes suggest instability
3. Complexity hotspots: longest files × most imports × most changes
4. Test debt: code changed recently with no corresponding test changes
5. Verdict: debt level (low / moderate / high / critical)
```

**Growth Module — Flexibility Assessment:**
```
1. Coupling score: how many files change together? (from git log --follow)
2. Extension points: are there interfaces/abstractions, or is everything concrete?
3. Configuration flexibility: how much behavior is configurable vs hardcoded?
4. Separation of concerns: is business logic separated from delivery mechanism?
5. Monolith readiness: if you needed to extract a service, where would you cut?
6. Verdict: flexibility (adaptable / rigid / locked)
```

**Integration Module — Integration Health:**
```
1. Failure handling: do external service calls have timeouts, retries, fallbacks?
2. Contract coverage: are there integration tests or contract tests?
3. Hardcoded endpoints: external URLs in source vs config
4. Missing circuit breakers: high-traffic external calls without protection
5. Verdict: integration resilience (robust / fragile)
```

**The GAP-ANALYSIS.md structure:**
```markdown
# Gap Analysis — [Project Name]

## Summary Dashboard
| Domain | Verdict | Critical Gaps | Recommendations |
|--------|---------|---------------|----------------|
| Architecture | Debt-carrying | 2 circular deps, 3 god files | Refactor auth module boundary |
| Security | Concerning | 5 unprotected endpoints | Add auth middleware sweep |
| Quality | Weak | 40% test coverage, no CI | Add CI first, then test coverage |
| ... | ... | ... | ... |

## Priority Issues (ordered by impact)
1. [Critical] 5 unprotected API endpoints — security risk
2. [Critical] No CI pipeline — quality regression risk  
3. [High] Auth module is a god file (800 lines) — change risk
4. [High] 3 dependencies with known CVEs — supply chain risk
...

## Recommended First Actions
1. Add CI pipeline (unblocks quality tracking)
2. Secure unprotected endpoints (highest risk)
3. Split auth god file (highest change frequency)

## Detailed Findings
[Per-module detailed findings below]
```

The gap analysis feeds directly into VALIDATE (human confirms priorities) and ORIENT (first milestone should address the most critical gaps).

### Phase 4: VALIDATE (Human reviews + corrects)

**This is not "does this look right?"** It's a structured review of both the system description AND the gap analysis:

```
Part A — System Description (ref-system.md):
1. CAPABILITIES: "I found N capabilities. Are any missing? Are any listed wrong?"
   - Human adds capabilities the agent couldn't detect (business logic, scheduled jobs, etc.)
   - Human corrects misidentified capabilities
   - Human clarifies business meaning of entities
   - Human identifies missing relationships
   - Human adds services accessed via infrastructure the agent can't see
   - Human flags deprecated integrations
4. KNOWN GAPS: "I couldn't determine: [list]. Can you fill these in?"
   - Agent explicitly states what it didn't find evidence for
Part B — Gap Analysis (GAP-ANALYSIS.md):

5. PRIORITIES: "Here are the critical gaps I found, ranked by impact. 
   Do you agree with this prioritization?"
   - Human reranks based on business context the agent can't see
   - Human may dismiss findings ("that unprotected endpoint is intentionally public")
   - Human may elevate findings ("that debt is worse than it looks")
   
6. SECURITY POSTURE: "Here's the security assessment. What compliance 
   requirements or threat model context should I add?"
   - Human adds regulatory requirements (HIPAA, SOC2, PCI-DSS)
   - Human adds threat model context ("we handle financial data")
   
7. GROWTH CONSTRAINTS: "Here's the flexibility assessment. Are there 
   planned changes that make any of these urgent?"
   - Human flags upcoming changes that make current rigidity critical
   - Human confirms what's acceptable vs what needs fixing
```

### Phase 5: ORIENT (Future direction)

Only AFTER the system is documented do we ask about the future:

```
1. "Now that we have a clear picture of what exists, where do you want to take this?"
2. "What's the biggest pain point or opportunity?"
3. "What constraints shape the roadmap?" (budget, timeline, team size)
4. "What should we explicitly NOT change?" (stability boundaries)
```

This produces `ref-prd.md` (the aspirational layer) and `ref-roadmap.md` (the plan).

**Key insight:** The human defines tomorrow's intent only after today's reality is documented. Not mixed together. Not from memory.

---

## Part 4: Greenfield Onboarding — Structured Design Facilitation

### Philosophy

Greenfield onboarding isn't just "what are you building?" — it's a guided design process that ensures you've thought through the dimensions that matter before writing code. The modules serve as design advisors, not just runtime checkers.

### The Process: 5 Phases

```
Phase 1: VISION → What and why (product level)
Phase 2: DESIGN → How (architecture level, module-guided)
Phase 3: CHALLENGE → Will this work? (stress-testing)
Phase 4: DOCUMENT → Produce reference docs
Phase 5: SCOPE → First milestone
```

### Phase 1: VISION (Product Identity)

Similar to PALS' questions, but more structured:

```
1. IDENTITY: "What are you building? One sentence."
2. USERS: "Who uses this? What do they need?"
3. PROBLEM: "What problem does this solve? Why now?"
4. VALUE: "How will you know this is working?" (Success metrics)
5. SCOPE: "What's in for v1? What's explicitly out?"
```

Output: Draft `ref-prd.md`

### Phase 2: DESIGN (Module-Guided Architecture)

This is the new part. Each relevant module acts as a **design advisor**, asking questions the human might not think to ask:

**Architecture Advisor:**
```
Based on what you've described, let's think about structure:

1. "What are the major components/layers?"
   [If unclear, suggest patterns: "For a REST API with a database, common 
   patterns are: 3-layer (routes/services/data), hexagonal, or feature-based. 
   Each has trade-offs for your use case..."]
   
2. "Where do the module boundaries go? What talks to what?"
   
3. "What data flows through the system? Trace a typical request."
```

**Data Advisor:**
```
Let's think about your data:

1. "What are the core entities? What are their relationships?"
   
2. "What's the access pattern — read-heavy, write-heavy, mixed?"
   
3. "Do you need real-time data, eventual consistency, or strong consistency?"
   
4. "What database technology fits? Why?" 
   [Present options with trade-offs for their use case]
```

**Security Advisor:**
```
Let's think about security from the start:

1. "Who should be able to do what?" (Authorization model)
   
2. "How will users authenticate?" 
   [Present options: session, JWT, OAuth, API keys — with trade-offs]
   
3. "What data is sensitive? How should it be protected?"
   
4. "What are the attack surfaces?" 
   [Guide through: user input, API endpoints, stored data, 
   third-party integrations]
```

**API Advisor (if applicable):**
```
Let's design the API surface:

1. "What are the core operations? Group them by resource."
   
2. "REST, GraphQL, or RPC? Why?"
   [Present trade-offs for their use case]
   
3. "Who consumes this API? What versioning strategy?"
   
4. "What's the error contract? How do consumers handle failures?"
```

**Resilience Advisor:**
```
Let's think about what goes wrong:

1. "What external dependencies do you have? What happens when each one fails?"
   
2. "What's the expected load? What happens at 10x?"
   
3. "What's the recovery story? If the server crashes, what's lost?"
   
4. "Do you need rate limiting, circuit breakers, retries?"
```

**Growth Advisor (NEW — not in PALS or CODA v6):**
```
Let's stress-test for future flexibility:

1. "If this succeeds, what's the next obvious thing to add?"
   → Does the architecture support it without rewrite?
   
2. "If you need to scale 10x, what breaks first?"
   → Database? API? State management?
   
3. "If you need to add a second client (mobile, CLI, other service), 
    what changes?"
   → Is the business logic separated from the delivery mechanism?
   
4. "What's the most likely thing you'll want to change in 6 months?"
   → Is that thing isolated or tangled?
   
5. "What assumption, if wrong, would require the biggest rewrite?"
   → Identify the riskiest bet
```

**Observability Advisor:**
```
Let's plan for knowing what's happening:

1. "How will you know if the system is healthy?"
   
2. "How will you debug production issues?"
   
3. "What metrics matter? What should alert?"
```

### Phase 3: CHALLENGE (Stress-Testing the Design)

After the design conversation, the agent synthesizes and pushes back:

```
"Here's what I see in the design. Let me challenge a few things:

1. COUPLING: [X] and [Y] are tightly coupled through [Z]. If you need to 
   change [X] later, you'll have to change [Y] too. Is that acceptable?

2. BOTTLENECK: All requests go through [single point]. At scale, this 
   becomes the bottleneck. Consider [alternative].

3. MISSING: You haven't addressed [error handling / caching / 
   configuration / logging]. These will come up in the first sprint.

4. ASSUMPTION: You're assuming [X]. If that's wrong, you'll need to 
   [significant change]. Worth validating early?

5. FLEXIBILITY: The [specific design choice] locks you into [constraint]. 
   If you want [likely future need], you'll need [escape hatch]."
```

The human can accept, revise, or defer each challenge. Deferred items become explicit assumptions in the PRD.

### Phase 4: DOCUMENT (Produce Reference Docs)

Agent produces all reference docs from the design conversation:

- `ref-system.md` — What the system will do (capabilities, from VISION + API design)
- `ref-architecture.md` — How it's built (from DESIGN advisor conversations)
- `ref-conventions.md` — How code should be written (from design decisions)
- `ref-prd.md` — Why it exists, for whom, success metrics

Each doc cites which design conversation produced it. The human reviews each.

### Phase 5: SCOPE (First Milestone)

With the design documented, scope the first milestone:

```
1. "What's the smallest thing you can build that proves the architecture?"
   [Vertical slice that touches all layers]
   
2. "What's the highest-risk assumption to validate first?"
   [Build the risky part early]
   
3. "What can you ship to get user feedback soonest?"
   [MVP framing]
```

---

## Part 5: New Modules for CODA v7

### From Gap Analysis

| Module | Domain | Init Hook | Issue Hooks | Rationale |
|--------|--------|-----------|-------------|-----------|
| **debt** | Tech Debt | ✓ | pre-plan, post-build, post-unify | Track debt accumulation/reduction. PALS has this (ruby), CODA doesn't. |
| **state** | State Management | ✓ | pre-plan, post-build | Frontend/backend state patterns. New domain. |
| **errors** | Error Handling | ✓ | pre-plan, post-build | Holistic error strategy. New domain. |
| **i18n** | Internationalization | ✓ | pre-plan, post-build | Hardcoded strings, translation completeness. New domain. |
| **config** | Configuration | ✓ | pre-plan, post-build | Config sources, env vars, feature flags. New domain. |
| **integrations** | External Services | ✓ | pre-plan, post-build | Service dependencies, contracts, failure modes. New domain. |
| **migration** | Migration Safety | — | pre-plan, post-build | Breaking changes, rollback paths, staged rollout. New domain. |

### From Onboarding Design

| Module | Domain | Onboarding Role | Rationale |
|--------|--------|-----------------|-----------|
| **growth** | Scalability & Flexibility | Design advisor (greenfield), stress-test (brownfield) | "Will this inhibit future flexibility?" — the question that never gets asked. |

### Updated Module Count

**CODA v6:** 17 modules (3 core + 7 domain + 7 specialist)
**CODA v7 proposed:** 25 modules (3 core + 7 domain + 8 specialist + 7 new)

Core (3): tdd, quality, knowledge
Domain (7): security, architecture, api, data, deps, docs, ci
Specialist — existing (7): a11y, ux, perf, resilience, observability, privacy, patterns
Specialist — new (8): debt, state, errors, i18n, config, integrations, migration, growth

### Default Enabled by Project Type

| Project Type | Default Enabled |
|-------------|----------------|
| **REST API / Backend** | core + security, architecture, api, data, deps, docs, ci, errors, config, integrations, resilience |
| **Frontend / SPA** | core + security, architecture, deps, docs, ci, a11y, ux, state, i18n, perf |
| **Full-Stack** | core + security, architecture, api, data, deps, docs, ci, errors, config, integrations, state |
| **CLI Tool** | core + security, architecture, deps, docs, ci, errors, config |
| **Library** | core + architecture, deps, docs, ci, api, patterns |

The `init` process detects project type from the scan and suggests the appropriate module set. Human confirms/adjusts.

---

## Part 6: FORGE — The Design Layer Above Milestones

### The Insight

CODA's unit of work is the **issue**. Issues compose into **milestones**. But there's a layer above that: **spec-level design**. This is where you shape what the system *is* or *becomes*, before decomposing into milestones and issues.
It's like a home:

| Home | CODA | Scale | Key Challenge |
|------|------|-------|---------------|
| **Build a new home** | Greenfield FORGE | Everything | Design from imagination. Easy to forget load-bearing concerns (security, scalability) because nothing exists yet to remind you. |
| **Buy a fixer-upper** | Brownfield FORGE | Everything | Understand what's load-bearing before you touch anything. The house already stands — you must assess it honestly, not from the realtor's description. |
| **Remodel a room** | Transformative FORGE | Part of system | You live in the house while the kitchen is torn up. Need a temporary setup. Phase the work so the home stays livable throughout. |
| **Build an addition** | Additive FORGE | Part of system | Build the new wing alongside the existing house. It stays intact the whole time. Connect them when the addition is ready. |

The distinction between remodeling and adding is critical:

- **Remodel (transform):** The system must remain *deployable and functional* at every step. REST and GraphQL coexist during transition. Old kitchen, new kitchen, temporary overlap. **Spec checkpoints per milestone** — the system spec is always in a valid intermediate state.

- **Addition (add):** The new capability builds in parallel. The existing system doesn't change until you're ready to connect. You can build the WebSocket infrastructure in isolation and wire it in when it works. **Connection point** — the existing spec is untouched until the integration milestone.

- **Fixer-upper (brownfield):** You're not designing from imagination. You're standing in the house, looking at the walls, figuring out what's load-bearing before you touch anything. **Evidence-first** — the spec is built from what the code tells you, not from memory.

- **New home (greenfield):** Everything is possible and nothing constrains you — which is exactly the danger. It's easy to draw a beautiful blueprint that ignores plumbing, wiring, and foundations. **Module-guided design** — each domain advisor forces you to think through the unglamorous structural concerns.

All four are the same fundamental activity: **forging the spec**. The process adapts to the backdrop.

### The Hierarchy

```
FORGE  (spec-level design)  → produces target spec + milestones
  └── Milestone              → produces issues  
        └── Issue            → CODA lifecycle (SPECIFY → BUILD → VERIFY → UNIFY)
```

FORGE is the *forging* of the design. CODA is the *concluding passage* of each piece of work. You FORGE the shape, then CODA through execution.

### The Command: `/coda forge`

One command. The process adapts to the backdrop.

```
/coda forge

Step 1: Detect backdrop
  - Empty project → Greenfield flow
  - Existing codebase, no .coda/ → Brownfield flow
  - Existing .coda/ project → Evolution flow (addition, migration, or pivot)
```

### Greenfield = First FORGE

`/coda forge` on an empty project IS greenfield init. The 5-phase process from Part 4:

```
VISION → DESIGN → CHALLENGE → DOCUMENT → SCOPE
```

Produces: initial `ref-system.md`, `ref-architecture.md`, `ref-conventions.md`, `ref-prd.md`, `ref-roadmap.md`, first milestones.

This is the project's first FORGE. The forge record lives in `.coda/forge/initial/`.

### Brownfield = First FORGE (from evidence)

`/coda forge` on an existing codebase without `.coda/`. The 5-phase process from Part 3:

```
SCAN → SYNTHESIZE → GAP ANALYSIS → VALIDATE → ORIENT
```

Produces: `ref-system.md` built from code evidence, gap analysis, reference docs, first milestones.

This is also the project's first FORGE. The forge record lives in `.coda/forge/initial/` with all evidence artifacts.

### Evolution = Subsequent FORGEs

`/coda forge` on an ongoing CODA project. The human describes what they want to accomplish:

```
/coda forge "Add real-time collaboration layer"
/coda forge "Migrate REST API to GraphQL"
/coda forge "Add multi-tenant support"
```

The process adapts based on whether this is *additive* or *transformative*:

#### Additive FORGE — Building an Addition

"Add real-time collaboration" — building a new wing onto the house. The existing house stays intact while you build alongside it. When the addition is ready, you punch through the wall and connect.

```
Phase 1: PROPOSE → What are we adding? Draft the capabilities.
Phase 2: DESIGN  → Module-guided architecture (same as greenfield Phase 2)
                    Each module acts as design advisor for the new capability.
Phase 3: CHALLENGE → Stress-test the design against the EXISTING system.
                      "How does this interact with what we already have?"
                      "Does this require changes to existing architecture?"
                      "Will this inhibit future flexibility?"
Phase 4: DIFF    → Produce the spec delta: what gets ADDED to ref-system.md,
                    what gets MODIFIED in ref-architecture.md.
Phase 5: PLAN    → Decompose into milestones with spec checkpoints.
Phase 6: APPROVE → Human commits. Milestones added to roadmap.
```

Key difference from greenfield: Phase 3 (CHALLENGE) tests the new design *against the existing house*. The growth module asks: "Does this addition create structural problems for the existing system? Does the foundation support it? Do you need to reinforce anything before connecting?"

Key difference from transformative: the existing spec is *untouched* until the integration milestone. You're building alongside, not tearing up.

#### Transformative FORGE — Remodeling a Room
"Migrate REST to GraphQL" — remodeling the kitchen while you live in the house. You need a temporary setup so you can still cook. The work is phased so the home stays livable throughout.

```
Phase 1: PROPOSE → Draft the TARGET spec — what the system looks like AFTER.
Phase 2: DIFF    → Structured delta: current spec vs target spec.
                    What's REMOVED, ADDED, MODIFIED.
Phase 3: ANALYZE → Module-driven impact assessment against the delta.
                    Every module evaluates the transformation:
                    - architecture: which layers change?
                    - api: which contracts break?
                    - security: which auth patterns need migration?
                    - quality: which tests break?
                    - integration: which external consumers are affected?
                    - growth: does this improve or reduce flexibility?
                    - migration: what's the safe transition path?
Phase 4: PLAN    → Decompose into PHASED milestones.
                    Each milestone has a spec checkpoint — what ref-system.md
                    should look like after that milestone.
                    The system spec evolves in controlled steps:
                    current → checkpoint 1 → checkpoint 2 → target.
Phase 5: APPROVE → Human reviews target, impact, phasing.
Phase 6: EXECUTE → Milestones run through normal CODA process.
```

Key difference from additive: the spec has **intermediate states** that must each be valid. You can't jump from REST to GraphQL in one step — you need a transition period where both exist, then a migration period, then cleanup.

### What FORGE Produces

```
.coda/forge/{name}/
├── target-system.md              # The destination spec (or initial spec for greenfield)
├── target-architecture.md        # Architecture changes (if any)
├── target-conventions.md         # Convention changes (if any)
├── DELTA.md                      # Structured diff current → target (evolution only)
├── IMPACT-ANALYSIS.md            # Module-driven impact assessment (transformative only)
├── GAP-ANALYSIS.md               # Module-driven gap analysis (brownfield only)
├── DESIGN-LOG.md                 # Design advisor conversations (greenfield/additive)
├── CHALLENGE-LOG.md              # Stress-test findings and responses
├── MILESTONE-PLAN.md             # Phased milestone roadmap with spec checkpoints
├── onboarding/                   # Evidence artifacts (brownfield only)
│   ├── EVIDENCE-architecture.md
│   ├── EVIDENCE-api.md
│   └── ...
└── status.yaml                   # Tracking: current milestone, progress, phase
```

### Module Behavior During Active FORGE

When a FORGE is active (milestones are executing toward a target spec):

- **SPECIFY** references the forge's target spec, not just the current spec. "This issue moves us from checkpoint 1 toward checkpoint 2."
- **VERIFY** checks progress toward the current milestone's spec checkpoint.
- **UNIFY** updates `ref-system.md` to reflect the checkpoint, not just the issue delta.
- **Modules** are forge-aware:
  - `migration` module verifies backward compatibility during transition phases
  - `api` module stops flagging old-pattern endpoints as violations during transition
  - `architecture` module validates the new structure is forming correctly
  - `growth` module checks that each checkpoint maintains the flexibility the target promises

### Forge Lifecycle

```
/coda forge "Add real-time collaboration"   → Creates .coda/forge/realtime-collab/
  └── PROPOSE → DESIGN → CHALLENGE → DIFF → PLAN → APPROVE
      └── Milestone 1: WebSocket infrastructure
      │     └── Issue 1.1 → SPECIFY → ... → UNIFY (checkpoint 1 applied)
      │     └── Issue 1.2 → SPECIFY → ... → UNIFY
      ├── Milestone 2: Presence + cursors
      │     └── Issue 2.1 → ... → UNIFY (checkpoint 2 applied)
      └── Milestone 3: Conflict resolution + CRDT
            └── Issue 3.1 → ... → UNIFY (target spec reached)
                                         └── FORGE COMPLETE
```

When the final milestone's UNIFY confirms `ref-system.md` matches `target-system.md`, the forge is marked complete and archived.

### When to FORGE vs When to Just Make Issues

| Signal | Use FORGE | Use Milestones/Issues |
|--------|-----------|----------------------|
| Touches architecture docs | ✓ | |
| Spans multiple milestones | ✓ | |
| Needs a transition plan | ✓ | |
| Modules need adjusted behavior | ✓ | |
| Single-milestone scope | | ✓ |
| Only changes code, not spec shape | | ✓ |
| Quick prototype/experiment | | ✓ |

### Why This Works

1. **Greenfield init is no longer special** — it's just your first FORGE. Same process, same artifacts.
2. **Large additions get proper design** — not just "make a milestone" but a full design process with module advisors, stress-testing, and spec checkpoints.
3. **Migrations have a transition plan** — the spec evolves in validated steps, not a big-bang rewrite.
4. **The name is perfect** — you FORGE the design, then CODA through execution. Two complementary metaphors.
5. **Everything produces artifacts** — the forge record is the audit trail of why the system looks the way it does. Design conversations, challenge responses, impact analyses. This IS the institutional knowledge.

---

## Part 7: Summary of Changes for v7
1. **Add 8 new modules** (debt, state, errors, i18n, config, integrations, migration, growth)
2. **Unify onboarding and large-scale design under FORGE** — `/coda forge` is the single command for all spec-level design: greenfield init, brownfield onboarding, additive evolution, transformative migration
3. **Brownfield FORGE** includes 5-phase reverse engineering (SCAN → SYNTHESIZE → GAP ANALYSIS → VALIDATE → ORIENT) with structured evidence gathering, module-driven gap analysis, and bottom-up spec building
4. **Greenfield FORGE** includes 5-phase design facilitation (VISION → DESIGN → CHALLENGE → DOCUMENT → SCOPE) with module-driven design advisors
5. **Evolution FORGE** includes additive flow (PROPOSE → DESIGN → CHALLENGE → DIFF → PLAN → APPROVE) and transformative flow (PROPOSE → DIFF → ANALYZE → PLAN → APPROVE) with spec checkpoints per milestone
6. **Add `growth` module** for "will this inhibit flexibility?" — active during all FORGE flows and ongoing issues
7. **Add gap analysis** — module-driven assessment producing prioritized GAP-ANALYSIS.md
8. **Add project type detection** during forge, with default module sets per type
9. **All FORGE artifacts persisted** in `.coda/forge/{name}/` for auditability and institutional knowledge