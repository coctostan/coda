# M5: Greenfield FORGE — v0.1 Spec

**Package:** `coda` → `src/forge/`
**Depends on:** M1 (data), M3 (tools)

## Purpose

`/coda forge` on a new project. Minimal greenfield flow that produces reference docs and scaffolds `.coda/`.

## v0.1 Flow

Simplified from the full FORGE spec. No DESIGN advisors, no CHALLENGE phase, no module-driven scanning. Just the essentials to get a project started.

```
/coda forge

Step 1: Detect backdrop
  - No .coda/ directory → greenfield
  - .coda/ exists → "Already initialized. Use /coda new to create an issue."

Step 2: Conversational interview (3-5 questions)
  1. "What are you building? One sentence."
  2. "Who uses this and what do they need?"
  3. "What's the tech stack?"
  4. "What's in scope for v1? What's explicitly out?"
  5. "Any key constraints?" (optional, skip if user is eager to start)

Step 3: Scaffold .coda/
  - Create .coda/ directory
  - Create .coda/coda.json with defaults
  - Add .coda/state.json to .gitignore
  - Create .coda/reference/
  - Create .coda/issues/
  - Create .coda/milestones/

Step 4: Generate reference docs
  - ref-system.md — what the system does (capabilities from interview)
  - ref-prd.md — why it exists, for whom, success metrics
  - Human reviews: "Here's what I captured. What's wrong?"
  - Agent revises based on feedback

Step 5: Create first milestone
  - Agent proposes a milestone based on v1 scope
  - Human confirms or adjusts
  - Milestone written to .coda/milestones/

Step 6: Ready
  - "Project initialized. Create your first issue with /coda new"
```

## What v0.1 FORGE Does NOT Do

- No brownfield (SCAN/SYNTHESIZE/GAP ANALYSIS)
- No DESIGN advisor phase (module-guided architecture questions)
- No CHALLENGE phase (stress-testing the design)
- No additive or transformative flows
- No spec checkpoints
- No FORGE completeness gate
- No ref-architecture.md or ref-conventions.md (generated in later versions)
- No milestone decomposition beyond one simple milestone

## coda.json Defaults

```json
{
  "tdd_test_command": null,
  "full_suite_command": null,
  "verification_commands": [],
  "tdd_gate": {
    "feature": true,
    "bugfix": true,
    "refactor": true,
    "chore": false,
    "docs": false
  },
  "human_review_default": {
    "feature": true,
    "bugfix": true,
    "refactor": false,
    "chore": false,
    "docs": false
  }
}
```

**Important:** FORGE must prompt the user for `tdd_test_command` and `full_suite_command` if the project has tests. These are required for TDD enforcement.

## .coda/ Structure After FORGE

```
.coda/
├── coda.json
├── state.json (gitignored)
├── reference/
│   ├── ref-system.md
│   └── ref-prd.md
├── milestones/
│   └── m1-{name}.md
└── issues/
```

## Files

```
packages/coda/src/forge/
├── greenfield.ts    # The conversational flow
└── scaffold.ts      # Directory/file creation
```

## Tests

- Scaffold creates correct directory structure
- coda.json has expected defaults
- ref-system.md and ref-prd.md are valid records (parseable frontmatter + body)
- Idempotency: running forge when .coda/ exists returns early with message
