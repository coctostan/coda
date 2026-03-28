# CODA — Specification v7

**Date:** 2026-03-24
**Status:** Implementation-ready
**Supersedes:** `coda-spec-v6.md` (v6), `coda-spec-v5.md` (v5), `forge-spec-v4.md` (v4/Forge), earlier versions
**Changes from v6:** (1) FORGE as the design layer above milestones — `/coda forge` unifies greenfield init, brownfield onboarding, additive evolution, and transformative migration under one structured process. (2) Eight new modules: debt, state, errors, i18n, config, integrations, migration, growth. (3) Brownfield gap analysis phase — module-driven assessment of what's missing, broken, and risky. (4) Greenfield design facilitation — module-driven architecture advisors with stress-testing. (5) Project type detection with default module sets. (6) Home analogy framing for FORGE variants.

---

## Mission

A lightweight, bulletproof project management and development framework for agent-assisted software projects. Takes a project from inception through delivery and sustains it through ongoing maintenance with compounding institutional knowledge.

The agent is the team. The human is the PM/engineering lead. The framework enforces discipline and captures knowledge so every completed issue makes the next one easier.

---

## Design Principles

1. **Tool-mediated writes.** The LLM never writes structured fields directly. Tools generate validated YAML frontmatter via code. The LLM writes prose (the body) via `coda_edit_body` — the one thing it's good at. `.coda/` is write-protected: `tool_call` blocks direct `write`/`edit` to any `.coda/**` path. This eliminates the entire class of GSD2-style parsing bugs and prevents validation bypass.

2. **Mechanize the skeleton, instruct the substance.** The process skeleton is mechanical (phase gates, session isolation, TDD write-gate, structured output requirements). The substance is LLM judgment (what to check, how to evaluate, what matters). Modules bridge the two: they inject expert context as prompts and require structured findings as evidence, but the analysis itself is model intelligence. We are building for SOTA models that will only improve — lean on their judgment, constrain their process.

3. **Two-layer data architecture.** Knowledge (mdbase — typed, queryable, VCS-tracked, human-readable). State (in-memory + atomic JSON persist — fast, incorruptible, gitignored). They never cross.

4. **The spec is the source of truth.** `ref-system.md` is the authoritative document for what the system does *right now*. Code is a derivative artifact — the implementation of the spec. Every issue proposes a spec delta during SPECIFY and merges it during UNIFY. If the agent rewrites every file, the spec is what tells you whether the rewrite is correct. Borrowed from OpenSpec's source-of-truth pattern.

5. **The Compound step.** Every completed issue should make future issues easier. Not just "document what happened" but "upgrade the system so it handles this better next time" — borrowed from Compound Engineering.

6. **Adaptive ceremony.** Not every issue needs the full pipeline. Bug fixes skip heavy planning. Chores skip review. The system right-sizes rigor — borrowed from specs.md FIRE.

7. **Stock Pi.** No fork. The extension uses only public Pi SDK APIs (`newSession`, `sendUserMessage`, `before_agent_start`, `tool_call`, `agent_end`). Data layer is fully portable if the extension outgrows Pi.

8. **Domain expertise via modules.** Specialized advisors (security, architecture, API contracts, accessibility, etc.) inject domain knowledge at phase boundaries. Modules produce structured findings, not just prose opinions. Each module can advise (context injection), warn (structured findings), or block (threshold exceeded). Modules are configurable and extensible — projects enable what's relevant. Inspired by PALS module system.

---

## The Three Layers

### Layer 1: FOUNDATION (project-level, living)

Institutional knowledge that accumulates across all issues. Created during project setup, updated during every UNIFY phase.

**mdbase type: `reference`**
```yaml
fields:
  title: { type: string, required: true }
  category: { type: string, required: true, constraints: { enum: [system, architecture, prd, convention, pattern, decision] } }
  topics: { type: list, items: { type: string } }
  last_verified: { type: string }
  last_updated_by: { type: string }  # issue slug that last updated this
```

**Standard reference docs (created at project init):**
- `ref-system.md` — **The Source of Truth.** What the system does *right now*, structured by capability. Not aspirational, not historical — current state. Every issue proposes a spec delta during SPECIFY and merges it during UNIFY. This is the authoritative document against which code is validated.
- `ref-prd.md` — Product requirements, user personas, value proposition, success metrics. The *why* and *what* at a product level.
- `ref-architecture.md` — System structure, module boundaries, data flow, tech stack. The *how* at a structural level.
- `ref-conventions.md` — Coding patterns, naming, file structure, testing conventions. The *how* at a code level.
- `ref-roadmap.md` — Milestones, priorities, what's next. The *when*.

**The distinction:** `ref-system.md` describes what the system *does* (capabilities, behaviors, integrations). `ref-architecture.md` describes how it's *built* (modules, layers, data flow). `ref-prd.md` describes *why* it exists and *what* it should become. All three are living documents, but `ref-system.md` is the primary source of truth for the current system state.

**Decision records (accumulate over time):**

**mdbase type: `decision`**
```yaml
fields:
  title: { type: string, required: true }
  issue: { type: string }
  date: { type: string, required: true }
  topics: { type: list, items: { type: string } }
  impact: { type: string, constraints: { enum: [low, medium, high] } }
  supersedes: { type: string }  # link to prior decision if reversing
```

Body: Context, Options considered, Decision and rationale, Consequences.

**Milestones:**

**mdbase type: `milestone`**
```yaml
fields:
  title: { type: string, required: true }
  status: { type: string, default: planned, constraints: { enum: [planned, active, complete] } }
  sort_order: { type: number }
  success_criteria: { type: list, items: { type: string } }
```

Body: Scope description — what this delivers, what's excluded.

### Layer 2: PROCESS (issue-level, per-issue lifecycle)

Created fresh for each unit of work.

**mdbase type: `issue`**
```yaml
fields:
  title: { type: string, required: true }
  issue_type: { type: string, required: true, constraints: { enum: [feature, bugfix, refactor, chore, docs] } }
  status: { type: string, default: proposed, constraints: { enum: [proposed, active, resolved, complete, wont-fix] } }
  phase: { type: string, constraints: { enum: [specify, plan, review, build, verify, unify, done] } }
  milestone: { type: string }
  priority: { type: number, default: 3, constraints: { min: 1, max: 5 } }
  branch: { type: string }
  current_task: { type: number }
  topics: { type: list, items: { type: string } }
  acceptance_criteria:
    type: list
    items:
      type: object
      fields:
        id: { type: string, required: true }       # "AC-1", "AC-2", etc.
        text: { type: string, required: true }      # The testable criterion
        status: { type: string, default: pending, constraints: { enum: [pending, met, not-met] } }
  open_questions: { type: list, items: { type: string } }   # gate checks length == 0
  deferred_items: { type: list, items: { type: string } }   # captured for backlog creation
  depends_on: { type: list, items: { type: string } }
  human_review: { type: boolean, default: true }  # human gate before BUILD (set during SPECIFY)
  deferred_from: { type: string }  # parent issue slug if this was created as a deferred/out-of-scope item
  spec_delta:
    type: object
    fields:
      added: { type: list, items: { type: string } }      # capabilities being added
      modified: { type: list, items: { type: string } }    # capabilities being changed
      removed: { type: list, items: { type: string } }     # capabilities being removed
      delta_summary: { type: string }                       # prose summary of system-level change
```

AC IDs are stable identifiers. The `coda_update` tool generates sequential IDs (`AC-1`, `AC-2`, ...) and validates uniqueness. All downstream references (task `covers_ac`, verification evidence, correction targets) use AC IDs, never raw text. Wording edits to AC text do not break traceability.

**mdbase type: `plan`**
```yaml
fields:
  title: { type: string, required: true }
  issue: { type: string, required: true }
  status: { type: string, default: draft, constraints: { enum: [draft, in-review, approved, superseded] } }
  iteration: { type: number, default: 1 }
  task_count: { type: number }
  human_review_status:
    type: string
    default: not-required
    constraints:
      enum: [not-required, pending, approved, changes-requested]
```

Body: Approach and rationale, Task decomposition, Dependencies, Risks, Human Review (status + notes, appended by `coda_edit_body` when human reviews).

**mdbase type: `task`**
```yaml
fields:
  id: { type: number, required: true }
  issue: { type: string, required: true }
  title: { type: string, required: true }
  status: { type: string, default: pending, constraints: { enum: [pending, active, complete, blocked] } }
  kind: { type: string, default: planned, constraints: { enum: [planned, correction] } }
  fix_for_ac: { type: string }                                # AC ID this fixes (corrections only): "AC-3"
  covers_ac: { type: list, items: { type: string } }          # references AC IDs: ["AC-1", "AC-3"]
  depends_on: { type: list, items: { type: number } }
  files_to_modify: { type: list, items: { type: string } }
  risk_level: { type: string, constraints: { enum: [low, medium, high] } }  # module-derived, affects verification strictness
  truths:
    type: list
    items: { type: string }          # "User can log in with email and password"
  artifacts:
    type: list
    items:
      type: object
      fields:
        path: { type: string, required: true }
        description: { type: string, required: true }
  key_links:
    type: list
    items:
      type: object
      fields:
        from: { type: string, required: true }
        to: { type: string, required: true }
        via: { type: string, required: true }       # "import of verifyCredentials"
```

**Task body sections:**
```markdown
## Objective
One sentence: what this task accomplishes.

## Test Scenarios
What to test (plain language, not code):
- Valid email + password → 200 with JWT
- Wrong password → 401 with error message
- Missing email → 400 validation error

## Done When
- All test scenarios pass
- All truths are observable
- All artifacts exist with real content
- All key links are intact
```

The body contains narrative context — why these truths matter, background for the artifacts, explanation of the links. Structured fields (truths, artifacts, key_links) live in frontmatter. The body is supplementary; frontmatter is authoritative for gates and verification.

**What a task does NOT contain:** Implementation code, pseudocode, function signatures, data structure definitions. Those are BUILD decisions.

**Correction tasks** are regular tasks with `kind: correction` and `fix_for_ac` set. They are stored in the same `issues/{slug}/tasks/` directory with IDs continuing from the planned tasks. If the plan created tasks 1–5, correction tasks are 6, 7, etc. This keeps `current_task` / `completed_tasks` tracking unified — one numeric space, one pipeline.

### Layer 3: COMPLETION (issue-level, post-process)

Written during UNIFY. Historical record + knowledge capture.

**mdbase type: `record`**
```yaml
fields:
  title: { type: string, required: true }
  issue: { type: string, required: true }
  completed_at: { type: string }
  topics: { type: list, items: { type: string } }
  reference_docs_reviewed: { type: boolean, default: false }
  system_spec_updated: { type: boolean, default: false }   # ref-system.md spec delta merged
  spec_delta_final:                                         # actual delta merged (may differ from SPECIFY delta)
    type: object
    fields:
      added: { type: list, items: { type: string } }
      modified: { type: list, items: { type: string } }
      removed: { type: list, items: { type: string } }
  module_findings_summary: { type: list, items: { type: string } }  # aggregated module findings
  reference_docs_updated: { type: list, items: { type: string } }
  milestone_updated: { type: boolean, default: false }
  patterns_captured: { type: list, items: { type: string } }
```

Body: Spec delta diff (SPECIFY intent vs UNIFY reality), Verification evidence (per-AC ID), Deviations from plan, Decisions made, Summary, Module findings aggregate, Knowledge promoted to reference docs.

---

## Process Architecture

### Three Nested Levels

**Project Level** — runs at milestone cadence:
```
FOUNDATION → SCOPE (milestone) → Decompose → issues
```

**Issue Level** — the main loop, repeats per issue:
```
SPECIFY → PLAN → REVIEW (review ⇄ revise) → [optional human plan review]
  → BUILD → VERIFY (verify ⇄ correct) → UNIFY → DONE
```

Seven phases: `specify`, `plan`, `review`, `build`, `verify`, `unify`, `done`. Within REVIEW and VERIFY, submodes track the autonomous evaluation loops:
- **REVIEW phase** — submodes: `review`, `revise`. Evaluator checks plan quality, reviser fixes issues. Max N iterations (configurable, default 3). Exhaustion pauses for human intervention.
- **VERIFY phase** — submodes: `verify`, `correct`. Evaluator checks ACs against reality, corrector creates targeted fix tasks. Max N iterations (configurable, default 3). Exhaustion pauses for human intervention.

**Task Level** — within BUILD and VERIFY(correct), repeats per task (autonomous):
```
Load context → Write test → Confirm fail → Write code → Confirm pass → Summary → Commit
```

### FOUNDATION / INIT
Project initialization is handled by `/coda forge` — the first FORGE is always the project setup. See the **FORGE** section for the full process.

**Quick summary:**
- **Greenfield:** `/coda forge` on empty project → VISION → DESIGN → CHALLENGE → DOCUMENT → SCOPE
- **Brownfield:** `/coda forge` on existing codebase → SCAN → SYNTHESIZE → GAP ANALYSIS → VALIDATE → ORIENT

Both produce: `ref-system.md`, `ref-prd.md`, `ref-architecture.md`, `ref-conventions.md`, `ref-roadmap.md`, first milestones.

The scaffolding step (creating `.coda/` directory, type schemas, config, module prompts) happens automatically before the FORGE process begins.
**What init produces:**
```
.coda/
├── mdbase.yaml
├── coda.json
├── state.json (gitignored)
├── _types/ (all type schemas)
├── reference/
│   ├── ref-system.md                    # THE SOURCE OF TRUTH
│   ├── ref-prd.md
│   ├── ref-architecture.md
│   ├── ref-conventions.md
│   └── ref-roadmap.md
├── forge/
│   └── initial/                         # First FORGE artifacts
│       ├── target-system.md
│       ├── DESIGN-LOG.md                # (greenfield) or EVIDENCE-*.md (brownfield)
│       ├── CHALLENGE-LOG.md             # (greenfield) or GAP-ANALYSIS.md (brownfield)
│       └── MILESTONE-PLAN.md
└── milestones/
    ├── m1-first-milestone.md
    └── ...
```
**Ongoing (via UNIFY):**
- Reference docs updated with learnings from each completed issue
- New decision records created for significant choices
- Conventions updated when new patterns emerge
- Architecture doc updated when system structure changes
- Milestone progress updated when success criteria are met
### SPECIFY

**Purpose:** Turn an idea into a testable contract.

**Inputs:** Issue description (human-provided or imported).

**Session strategy:** Single conversational session. Human in loop. Agent and human collaborate until ACs are approved.

**Process:**
1. Agent reads issue + `ref-system.md` (current state) + relevant reference docs + codebase area
2. Agent and human collaborate conversationally (one question at a time)
3. Agent captures requirements with tagging: R# (must-have), O# (optional), D# (deferred), C# (constraint), Q# (open question)
4. Agent drafts acceptance criteria — specific, testable, bite-sized, with stable IDs
5. **Agent drafts spec delta** — proposed changes to `ref-system.md`: what capabilities will be ADDED, MODIFIED, or REMOVED by this issue. The delta is written to the issue body and represents the *intended end state* of the system after the issue is complete.
6. Enabled modules run their `pre-specify` hooks — injecting domain context relevant to the issue's scope (e.g., security module flags auth-related patterns, architecture module identifies affected layers)
7. Any items identified as out-of-scope → agent calls `coda_create({ type: "issue", status: "proposed" })` to capture as backlog items
8. Human reviews ACs + spec delta, requests changes or approves (conversational)
9. On approval, agent calls `coda_update()` to write ACs, topics, open_questions (empty), deferred_items, and spec_delta to the issue record

**Outputs:**
- Issue record updated with `acceptance_criteria` (structured objects with IDs), `topics`, `open_questions: []`, `spec_delta`, `phase: plan`
- Issue body contains: requirements (R#/O#/D#/C#/Q#), traceability matrix (which R# maps to which AC ID), spec delta (ADDED/MODIFIED/REMOVED sections referencing `ref-system.md`), out of scope narrative. This is prose — structured fields are in frontmatter, traceability narrative is in body.
- Backlog issues for deferred items (if any)
- Module findings from `pre-specify` hooks (if any modules produced warnings)

**Gate (SPECIFY → PLAN):** `acceptance_criteria.length > 0 && open_questions.length == 0`

### PLAN

**Purpose:** Decompose the spec into a buildable strategy.

**Session strategy:** Fresh autonomous session. Reads from disk only.

**Inputs:** Issue with approved ACs, reference docs.

**Process:**
1. Agent reads issue ACs + architecture + conventions + relevant prior records
2. Agent designs approach (strategy, not implementation)
3. Agent decomposes into tasks with:
   - Ordering and dependencies
   - AC-to-task mapping (every AC covered by at least one task, via `covers_ac` referencing AC IDs)
   - Per-task: objective, truths, artifacts, key_links, test scenarios, files to modify
4. Any items identified as out-of-scope → agent calls `coda_create({ type: "issue", status: "proposed" })` to capture as backlog items
5. Agent calls `coda_create()` for plan + task records
6. Phase advances to REVIEW

**Outputs:**
- Plan record (strategy, risks)
- Task records (one per task, with structured must-haves and test scenarios)
- Backlog issues for deferred items (if any)

**Gate (PLAN → REVIEW):** Plan exists. Every AC ID maps to at least one task (validated from tasks' `covers_ac` fields). Dependencies are acyclic.

### REVIEW (autonomous submode loop: review ⇄ revise)

**Purpose:** Validate the plan before building. Autonomous — agent reviews, agent revises, loop until pass or max iterations.

**Submode flow:**
```
review ⇄ revise → [approved] → [optional human plan review] → (exit REVIEW phase)
```

#### Submode: REVIEW (evaluator)

**Session strategy:** Fresh autonomous session. Reads plan + tasks from disk.

**Structural checks (automated by extension):**
1. AC coverage — every AC ID in at least one task's `covers_ac`
2. Dependency ordering — no task depends on a later task
3. File scope — files listed exist or are reasonable new paths

**Quality checks (agent evaluates):**
4. Strategy sanity — is the approach sound given the codebase?
5. Test scenario quality — are scenarios specific enough to be testable?
6. Scope — doing what the spec asks, no more?

If all pass → plan `status: approved`. Transition depends on `human_review` field:
- If `human_review: true` → `plan.human_review_status` set to `pending`, pause for human plan review
- If `human_review: false` → `plan.human_review_status` stays `not-required`, advance to BUILD automatically

If issues found → write revision instructions to disk, submode transitions to `revise`.

#### Submode: REVISE (worker)

**Session strategy:** Fresh autonomous session. Reads plan + revision instructions from disk.

**Process:**
- Reads plan + revision instructions from disk
- Updates plan and/or task records to address issues
- Submode transitions back to `review`

**Max iterations:** Configurable (default: 3). When exhausted, extension pauses: "Review loop exhausted after N iterations. Issues remaining: [list]. Human input needed." Human can:
- **Provide guidance** — human gives written instructions, extension writes them to revision instructions on disk, submode resets to `revise`, `loop_iteration` resets to 0
- **Manually approve** — human invokes `/coda advance`. Extension sets `plan.status = approved` and `plan.human_review_status = approved` (regardless of autonomous review findings), transitions to BUILD
- **Kill the issue** — human invokes `/coda kill`. Extension sets `issue.status = wont-fix`, `issue.phase = done`, clears `state.json`. Issue is terminal

#### Human plan review gate

Configurable per issue (`human_review` field, set during SPECIFY). When enabled, after the REVIEW/REVISE loop produces an approved plan, the human reviews the plan conversationally before BUILD starts. Default by issue type: features=true, bugfixes=configurable, refactors/chores/docs=false.

**Durable artifact:** The plan record's `human_review_status` field tracks this gate:
- `not-required` — issue has `human_review: false`
- `pending` — autonomous review approved, waiting for human
- `approved` — human approved the plan
- `changes-requested` — human rejected; `coda_edit_body` appends `## Human Review` section with notes; submode transitions back to `revise`

**Gate (REVIEW → BUILD):**
- `plan.status == "approved"`
- If `issue.human_review == true`, then `plan.human_review_status == "approved"`

### BUILD

**Purpose:** Implement the plan task by task.

**Session strategy:** Fresh session per task (`newSession()`). Prior task's summary on disk is carry-forward.

**The loop:**
```typescript
// Validated by prototype: newSession, sendUserMessage, agent_end, tool_call write-gate
// Design choices built on top: post-task verification, commit boundaries, auto-fix retry
for each task:
    newSession()                    // fresh context
    before_agent_start              // inject task context + conventions
    sendUserMessage("Execute")      // trigger agent
    await agent_end Promise         // completion detection
    post-task verification          // configurable commands (lint, typecheck)
    write task summary              // structured carry-forward
    commit                          // VCS boundary
```

**Per-task context injection:**
- System prompt: "You are executing task N of M"
- Task record (objective, truths, artifacts, key_links, test scenarios, files)
- Conventions section matching task's topics
- Task summaries for dependency tasks (from `depends_on`), falling back to last 2-3 by recency if no dependencies declared
- TDD instructions if write-gate active

**TDD write-gate (evidence-based, no self-reporting):**
- Mechanical: `tool_call` intercepts `write`/`edit` to non-test files
- Blocked when gate is locked (default state for each task)
- Unlocked when `coda_run_tests` records a failing test (exit code ≠ 0) — observed by extension, not self-reported
- Relocked when `coda_run_tests` records passing tests (exit code == 0)
- If TDD is enabled for this issue type and no `tdd_test_command` is configured, BUILD fails fast with a configuration error — TDD is never trust-based

**Post-task verification:**
- Configurable shell commands: `npm run lint`, `npm run typecheck`, etc. (these are `verification_commands`, NOT the TDD test command)
- Auto-fix retry on failure (max 2 attempts, configurable)
- Zero-tool-call hallucination guard: task with no tool calls → rejected

**Task summary (on completion):**
Task record updated via `coda_update`: `status: complete`. Body gets `## Summary` section appended via `coda_edit_body({ op: "append_section", section: "Summary", content: "..." })`: what was built, files changed, decisions made, anything unexpected. This summary is the carry-forward artifact for subsequent tasks.

After all planned tasks complete, phase advances to VERIFY.

**Gate (BUILD → VERIFY):** All planned tasks (`kind: planned`) have `status: complete`.

### VERIFY (autonomous submode loop: verify ⇄ correct)

**Purpose:** Confirm the system meets all acceptance criteria. Fix what's broken.

**Submode flow:**
```
verify ⇄ correct → [all ACs met] → (exit VERIFY phase)
```

#### Submode: VERIFY (evaluator)

**Session strategy:** Fresh session. Reads all task summaries + ACs from disk.

**Process:**
1. Agent reads all ACs (with IDs) and the spec delta from the issue record
2. For each AC, agent collects evidence:
   - **Truths check:** Read task truths from frontmatter, run commands or read output to verify observable behaviors
   - **Artifacts check:** Read task artifacts from frontmatter, confirm files exist with real content (min lines, exports)
   - **Key Links check:** Read task key_links from frontmatter, confirm imports/references connect the pieces
   - **Test evidence:** Which tests cover this AC? Run `coda_run_tests` with `full_suite_command` to confirm they pass
3. **Spec delta check:** Does the system now match the spec delta proposed during SPECIFY? Agent reads `ref-system.md` (current) and the issue's `spec_delta` — are the ADDED capabilities present? MODIFIED capabilities changed correctly? REMOVED capabilities gone?
4. Enabled modules run their `post-build` hooks — producing structured findings (security, API contracts, architecture, etc.)
5. Verdict per AC ID: `met` / `not-met`
6. Agent calls `coda_update()` to set each AC's `status` field
7. If any `not-met` or module BLOCK findings → write structured verification failure artifact to disk, submode transitions to `correct`
8. If all `met` and no BLOCK findings → full test suite run (regression check via `full_suite_command`)
9. If regression passes → VERIFY phase complete, advance to UNIFY

**Verification failure artifact (per unmet AC):**
Written to disk as structured data for correction task generation:
```yaml
ac_id: AC-3
status: not-met
failed_checks:
  - type: artifact_missing
    detail: "src/auth/token.ts does not export createToken"
  - type: test_failure
    detail: "auth/login returns 500 on invalid password"
source_tasks: [2, 4]        # planned/correction tasks that covered this AC
relevant_files:
  - src/auth/token.ts
  - src/routes/auth.ts
```

**Gate (VERIFY → UNIFY):** All ACs have `status: met`. Full suite passes.

#### Submode: CORRECT (worker)

**Purpose:** Fix issues found by VERIFY. Targeted, smaller tasks derived from verification failures.

**Session strategy:** Fresh session per correction task. Same mechanics as BUILD.

**Process:**
1. Extension reads verification failure artifacts from disk
2. Extension auto-creates targeted correction tasks in `issues/{slug}/tasks/`:
   - Numeric IDs continuing from planned tasks (if plan had tasks 1–5, corrections are 6, 7, ...)
   - `kind: correction`, `fix_for_ac: "AC-3"`
   - `covers_ac: ["AC-3"]`
   - Truths, artifacts, key_links derived from: the failed AC ID, the verification failure artifact, and the source tasks that originally covered that AC
   - `files_to_modify` from the verification failure's `relevant_files`
3. Runs BUILD-style loop on correction tasks (newSession per task, TDD gate, summaries, commits)
4. Submode transitions back to `verify` for re-check

**Max iterations:** Configurable (default: 3). When exhausted, extension pauses: "Verify/correct loop exhausted after N iterations. Unmet ACs: [list]. Human input needed." Human can:
- **Provide guidance** — human gives written instructions, extension writes them as new correction context, submode resets to `correct`, `loop_iteration` resets to 0
- **Manually fix code and resume** — human edits source files directly outside CODA, then invokes `/coda advance`. Extension re-enters `verify` submode with `loop_iteration` reset to 0
- **Rescope** — human invokes `/coda back` to SPECIFY. Extension sets `issue.phase = specify`, clears plan/task state. Human updates ACs to reduced scope, creates new issues for deferred work via `coda_create`, then re-runs PLAN/REVIEW/BUILD/VERIFY
- **Kill the issue** — human invokes `/coda kill`. Extension sets `issue.status = wont-fix`, `issue.phase = done`, clears `state.json`. Issue is terminal

### UNIFY (the compounding step)

**Purpose:** Capture knowledge, update documentation, close the loop. This is CODA's differentiator — combining OpenSpec's delta-merge, Compound Engineering's system-upgrade step, and a mechanically-enforced closing gate.

**Session strategy:** Fresh autonomous session. Reads everything from disk.

**Five mandatory actions:**

**1. Merge spec delta into `ref-system.md` (the primary output)**
- Agent reads the spec delta from the issue record (drafted during SPECIFY)
- Agent compares the delta against what was *actually* built (may differ from the original delta)
- Agent produces the *final* delta — adjusted for any deviations from the original spec
- Agent calls `coda_edit_body()` to apply ADDED/MODIFIED/REMOVED changes to `ref-system.md`
- Extension previews the diff to the human. Human approves or rejects.
- This is the most important artifact: after merge, `ref-system.md` accurately describes the system's current capabilities.
- If the original spec delta was wrong (scope changed during BUILD), the UNIFY delta reflects reality, not the original plan.

**2. Write completion record**
- Per-AC verification evidence (keyed by AC ID)
- Deviations from plan (what changed and why)
- Spec delta diff (original SPECIFY delta vs final UNIFY delta — what changed about the intended system changes)
- Decisions made during the issue
- Summary of what was built
- Patterns captured (reusable insights)
- Module findings summary (aggregated from all phase hooks)

**3. Review and update other reference docs**
- Agent queries: which reference docs share topics with this issue?
- For each matching doc: does this issue change anything about the documented architecture/conventions/patterns?
- If yes: agent calls `coda_update()` for frontmatter changes and `coda_edit_body()` for prose changes on the reference doc. Extension shows the diff to the human. Human approves or rejects each update.
- If no updates needed: confirmed explicitly. Completion record gets `reference_docs_reviewed: true, reference_docs_updated: []`.
There is no separate delta artifact. The diff produced by `coda_update` and `coda_edit_body` IS the delta. The extension previews the diff to the human before applying the change to the reference doc.

**4. Capture knowledge for compounding (Compound Engineering)**
- "Would the system catch this automatically next time?"
- New conventions → update `ref-conventions.md`
- New patterns → create new reference doc or update existing
- New decisions → create `decision` record with context and rationale
- Lessons learned → update relevant reference doc sections
- Module-specific knowledge: security findings become conventions, architecture decisions become patterns

**5. Update milestone progress**
- Check which milestone this issue belongs to
- Update milestone success criteria status if applicable (mark criteria as `met`)
- Update roadmap narrative if milestone progress changed
**Gate (UNIFY → DONE):** Completion record exists. `ref-system.md` updated (spec delta merged OR explicitly confirmed no change). `reference_docs_reviewed: true`. `milestone_updated: true` (or issue has no milestone). VCS merge ready.

---

## State Management

**Source of truth:** `state.json` is the runtime cursor — fast, atomic, managed by extension code. Issue frontmatter `phase` is the durable authority. They should always agree. On mismatch, `state.json` is rebuilt from mdbase (`reconstructFromData()`).

**State schema:**

```json
{
  "version": 1,
  "focus_issue": "auth-login",
  "phase": "build",
  "submode": null,
  "loop_iteration": 0,
  "current_task": 3,
  "completed_tasks": [1, 2],
  "tdd_gate": "locked",
  "last_test_exit_code": null,
  "last_test_command": null,
  "build_mode": "autonomous",
  "task_tool_calls": 0,
  "enabled": true
}
```

**Submode tracking by phase:**

| Phase | Valid submodes | Typical flow |
|-------|---------------|-------------|
| `specify` | `null` | Single conversational session |
| `plan` | `null` | Create plan + tasks, then advance to REVIEW |
| `review` | `review`, `revise` | `review ⇄ revise → approved` |
| `build` | `null` | Execute planned tasks sequentially |
| `verify` | `verify`, `correct` | `verify ⇄ correct → all ACs met` |
| `unify` | `null` | Single autonomous session |
| `done` | `null` | Terminal |

**Properties:**
- Managed entirely by extension code
- Modified only through `coda_signal` / `coda_advance` / `coda_run_tests` tools
- LLM never reads or writes `state.json` directly
- Gitignored — ephemeral process memory
- Reconstructable from mdbase if lost (query issue with `status: active`, read its phase, find tasks with `status: complete`)

**State transitions enforced at tool layer:**
- `coda_advance` checks gates before allowing phase transition
- `coda_signal` validates transition (e.g., can't signal `task_done` if no task is active)
- `coda_run_tests` manages TDD gate state based on observed test results
- Invalid transitions return clear error messages to the LLM

**Phase transition handoffs:**

| Transition | Handoff artifact (on disk) |
|-----------|---------------------------|
| SPECIFY → PLAN | Issue record with ACs (structured, with IDs) |
| PLAN → REVIEW | Plan + task records |
| REVIEW(review) → REVIEW(revise) | Revision instructions |
| REVIEW(revise) → REVIEW(review) | Updated plan + tasks |
| REVIEW → BUILD | Approved plan + human review approval (if enabled) |
| BUILD task → BUILD task | Task summary |
| BUILD → VERIFY | All planned task summaries |
| VERIFY(verify) → VERIFY(correct) | Verification failure artifacts (per unmet AC ID) |
| VERIFY(correct) → VERIFY(verify) | Correction task summaries |
| VERIFY → UNIFY | All ACs `status: met` + regression pass |
| UNIFY → DONE | Completion record + reference updates |

No phase reads from the prior phase's conversation. Every phase reads from mdbase records on disk. A session crash between phases loses nothing — the artifact was written before the transition.

---

## Enforcement Model

### Tier 1: Mechanical (tool-layer, cannot be bypassed)

| Rule | Enforcement |
|------|-------------|
| Can't write to `.coda/` directly | `tool_call` blocks `write`/`edit` to `.coda/**` paths |
| Can't write production code without failing test | `tool_call` blocks `write`/`edit` unless TDD gate unlocked by observed test failure via `coda_run_tests` |
| TDD requires real test execution | `coda_run_tests` runs `tdd_test_command` and observes exit code; no self-reporting fallback; missing config = fail fast |
| Can't start PLAN without approved ACs | `coda_advance` gate: `acceptance_criteria.length > 0 && open_questions.length == 0` |
| Can't start BUILD without approved plan | `coda_advance` gate: `plan.status == "approved"` + `plan.human_review_status` check (if enabled) |
| Can't close issue without spec delta merge + record + ref updates | `coda_advance` gate: completion record exists, `system_spec_updated: true`, `reference_docs_reviewed: true` |
| VCS commits only at task boundaries | `tool_call` intercepts git mutations outside commit hooks |
| Zero-tool-call task rejection | Task with no tool calls → rejected |

### Tier 2: Structured Evidence (module-driven, LLM judgment + required output)

| Rule | Enforcement |
|------|-------------|
| Domain checks at phase boundaries | Modules inject context prompts and require structured findings (Finding schema). Model does the analysis; output shape is validated. |
| Block threshold exceeded | If any module finding exceeds configured `block_threshold`, phase transition is blocked with structured explanation. |
| Module findings recorded | All findings persisted in issue record for human review and UNIFY knowledge capture. |
| Spec delta consistency | VERIFY checks that system matches the spec delta proposed during SPECIFY. UNIFY merges the confirmed delta into `ref-system.md`. |

### Tier 3: Agent Judgment (instructed, verified after the fact)
| Rule | Verification |
|------|-------------|
| Scope discipline | VERIFY reconciles plan vs actual |
| Convention adherence | Conventions loaded in context |
| Summary quality | Carry-forward depends on it |
| Must-haves met | VERIFY checks truths/artifacts/key_links from task frontmatter |
| Module analysis quality | Human reviews structured findings — the model shows its work |

### Human Discretion

| Decision | When | Persisted effect |
|----------|------|------------------|
| Issue type + priority | Issue creation | `issue.issue_type`, `issue.priority` |
| AC approval | SPECIFY | `issue.acceptance_criteria`, `issue.phase = plan` |
| Human plan approval (normal gate) | After autonomous REVIEW approval | `plan.human_review_status = approved` |
| REVIEW exhaustion: provide guidance | REVIEW loop exhausted | Revision instructions artifact written to disk, `submode = revise`, `loop_iteration = 0` |
| REVIEW exhaustion: manually approve | REVIEW loop exhausted | `plan.status = approved`, `plan.human_review_status = approved`, transition to BUILD |
| VERIFY exhaustion: provide guidance | VERIFY loop exhausted | Correction context artifact written to disk, `submode = correct`, `loop_iteration = 0` |
| VERIFY exhaustion: manually fix and resume | VERIFY loop exhausted | Re-enter `submode = verify`, `loop_iteration = 0` |
| VERIFY exhaustion: rescope | VERIFY loop exhausted | `/coda back` to `specify`; `issue.phase = specify`, downstream plan/task state cleared, deferred work captured as new issues if needed |
| Reference doc approval | UNIFY | `reference_docs_reviewed: true` on completion record |
| `/coda pause` | Any time | State persisted to `state.json`, automation stops |
| `/coda back` | Any time (outside active task) | `issue.phase` set to target phase, downstream plan/task state cleared as needed |
| `/coda kill` | Any time | `issue.status = wont-fix`, `issue.phase = done`, `state.json` cleared |

---

## Context Management

### Per-Phase Context Budgets

| Phase | Injected context | Budget target |
|-------|-----------------|---------------|
| SPECIFY | Issue description + relevant reference doc sections + recent related records | ~4K tokens |
| PLAN | Issue + ACs + architecture + conventions + relevant prior records | ~6K tokens |
| REVIEW (per submode) | Plan + task summaries + AC list + revision instructions (if revise) | ~4K tokens |
| BUILD (per task) | Task record + conventions (topic-matched) + dependency task summaries | ~4K tokens |
| VERIFY (per submode) | Issue ACs + all task summaries + plan overview + failure artifacts (if correct) | ~6K tokens |
| UNIFY | Issue ACs + plan + all task summaries + reference docs (topic-matched) | ~8K tokens |

### Session Strategy — Phase Boundaries Are Context Boundaries

Every phase transition creates a new session. The prior phase's written artifact is the complete handoff — no conversational context carries across phase boundaries.

**Conversational phases (single session, human in loop):**
- SPECIFY — one session. Agent and human collaborate. Ends with issue record write (ACs with IDs, topics, traceability).
- Human plan review — one session (if enabled). Human reviews plan, gives feedback. Ends with `plan.human_review_status` set to `approved` or `changes-requested`.

**Autonomous phases (fresh session per unit):**
- PLAN — fresh session. Reads issue + reference docs from disk.
- REVIEW (review submode) — fresh session. Reads plan + tasks from disk.
- REVIEW (revise submode) — fresh session. Reads plan + revision instructions from disk.
- BUILD — `newSession()` per task. Prior task's summary on disk is carry-forward.
- VERIFY (verify submode) — fresh session. Reads all task summaries + ACs from disk.
- VERIFY (correct submode) — `newSession()` per correction task.
- UNIFY — fresh session. Reads everything from disk.

### Carry-Forward Strategy

BUILD context injection uses the task `depends_on` field when available:
- If task 7 depends on tasks 2 and 3, inject summaries for tasks 2 and 3 (not the unrelated tasks 5 and 6)
- Fall back to last 2-3 by recency if no dependencies declared
- Correction tasks get summaries from the planned/correction tasks that touched the relevant files

### Section-Level Retrieval

Reference docs can be large. The extension parses `## Heading` boundaries and injects only the sections matching the current issue's topics, not the entire doc.

### Module Finding Context Management

Module findings accumulate across phases (pre-plan, post-task, post-build, etc.). To prevent context bloat:

- **Within a phase:** Full findings are available (the model needs detail to act on them).
- **Across phases:** Findings are summarized. VERIFY gets: `"security: 2 critical (hardcoded secret in auth.ts, SQL injection in users.ts), 1 high, 3 info"` — not the full finding objects from every prior hook.
- **In UNIFY:** Summary table of all module findings across the issue lifecycle, with details only for unresolved items.
- **Module findings are NOT carried in conversational context.** They're written to disk (`.coda/issues/{slug}/module-findings.json`) and loaded by reference when needed.

---

## VCS Integration

### GitHub Flow

- `main` is always deployable
- Feature branch per issue: `feat/auth-login`, `fix/timeout-bug`
- PR created during UNIFY for human review
- Squash merge for clean history
- Branch deleted after merge

### Commit Boundaries

- Code + tests committed after each BUILD task completes
- Commit message derived from task summary
- Correction tasks also get individual commits

### v1: Single Issue

One active issue at a time. One feature branch. No pause/resume/switch complexity.

`main` → `feat/issue-slug` → work through all phases → PR → merge → back to main.

---

## Error Recovery

### Class 1: Process crash mid-task
- State on disk: `phase: build, current_task: 3`
- Recovery: On restart, read state. `/coda resume` re-enters BUILD for task 3. Fresh session — agent assesses partial state on disk and continues.
- Safety: State writes are atomic (write to temp file, rename).

### Class 2: Agent stuck in a loop
- Detection: Track tool calls per task. Same error 3+ times or >50 tool calls (configurable) without file changes → stuck.
- Recovery: Signal agent to write summary of attempts, mark task `blocked`, pause loop for human.
- Applies to both planned tasks and correction tasks.

### Class 3: State/data mismatch
- Detection: On session start, cross-check state.json against mdbase (issue exists? plan exists? task exists?).
- Recovery: `reconstructFromData()` — find active issue in mdbase, read its `phase` field (the authority), find completed tasks, rebuild state.json.

### Class 4: Submode loop exhaustion
- Detection: `loop_iteration >= max_iterations` (configurable per loop type).
- Recovery: Pause automation, present human with remaining issues.
- REVIEW exhaustion: available actions are provide guidance, manually approve, or kill the issue. Persisted effects are exactly those defined in the REVIEW phase's **Max iterations** section.
- VERIFY exhaustion: available actions are provide guidance, manually fix and resume, rescope via `/coda back` to SPECIFY, or kill the issue. Persisted effects are exactly those defined in the VERIFY phase's **Max iterations** section.

### Atomic state writes
- Write to `state.json.tmp`, then `rename()` to `state.json`
- If process dies between write and rename, old state.json is intact
- On startup, if `state.json.tmp` exists, it's a failed write — delete it, use `state.json`

---

## Configuration

**Project level:** `.coda/coda.json`
**User level:** `~/.coda/config.json` (overrides project)

```json
{
  "models": {
    "plan": { "model": "claude-sonnet-4-6", "thinking": "high" },
    "review": { "model": "claude-opus-4-6", "thinking": "high" },
    "revise": { "model": "claude-sonnet-4-6", "thinking": "high" },
    "build": { "model": "claude-sonnet-4-6", "thinking": "medium" },
    "verify": { "model": "claude-opus-4-6", "thinking": "high" },
    "correct": { "model": "claude-sonnet-4-6", "thinking": "medium" },
    "unify": { "model": "claude-sonnet-4-6", "thinking": "medium" }
  },
  "tdd_test_command": "npm test -- --findRelatedTests",
  "full_suite_command": "npm test",
  "verification_commands": ["npm run lint", "npm run typecheck"],
  "verification_auto_fix": true,
  "verification_max_retries": 2,
  "human_review_default": {
    "feature": true,
    "bugfix": true,
    "refactor": false,
    "chore": false,
    "docs": false
  },
  "max_review_iterations": 3,
  "max_verify_iterations": 3,
  "stuck_detection_threshold": 50,
  "tdd_gate": {
    "feature": true,
    "bugfix": true,
    "refactor": true,
    "chore": false,
    "docs": false
  }
  },
  "modules": {
    "security": { "enabled": true, "block_threshold": "critical" },
    "architecture": { "enabled": true, "block_threshold": "high" },
    "api": { "enabled": true, "block_threshold": "high" },
    "data": { "enabled": true, "block_threshold": "critical" },
    "tdd": { "enabled": true, "block_threshold": "high" },
    "quality": { "enabled": true, "block_threshold": "high" },
    "knowledge": { "enabled": true, "block_threshold": "none" },
    "deps": { "enabled": true, "block_threshold": "high" },
    "docs": { "enabled": true, "block_threshold": "none" },
    "ci": { "enabled": true, "block_threshold": "none" },
    "a11y": { "enabled": false },
    "ux": { "enabled": false },
    "perf": { "enabled": false },
    "resilience": { "enabled": false },
    "observability": { "enabled": false },
    "privacy": { "enabled": false },
    "patterns": { "enabled": true, "block_threshold": "none" }
  }
}
```

**Command roles:**
- `tdd_test_command` → per-task red/green TDD loop (used by `coda_run_tests` during BUILD)
- `full_suite_command` → full regression check (used by `coda_run_tests` during VERIFY)
- `verification_commands` → non-test post-task checks (lint, typecheck — run after each BUILD task)

`null` or missing model/thinking = use current selection. Extension calls `pi.setModel()` and `pi.setThinkingLevel()` at phase/submode transitions.

SPECIFY is not in the models config because it's collaborative (human drives, model stays as-is).

`human_review_default` is per issue type, not a single boolean. The issue's `human_review` field is set during SPECIFY based on this config and can be overridden per-issue.

If `tdd_gate` is enabled for an issue type and `tdd_test_command` is not configured, BUILD fails fast with a configuration error. TDD enforcement is never trust-based.

**Gate automation** — configurable per-project, overridable per-issue type or milestone:

```json
{
  "gates": {
    "specify_approval": "human",
    "plan_review": "human",
    "spec_delta_review": "auto",
    "reference_doc_updates": "auto",
    "module_findings": "auto-unless-block"
  }
}
```

- `"human"` — always requires human approval
- `"auto"` — gate passes automatically (findings recorded but don't block)
- `"auto-unless-block"` — auto-passes unless a module finding exceeds block threshold

Per-issue type overrides (e.g., features always require human plan review, bugfixes auto-approve):

```json
{
  "gate_overrides": {
    "bugfix": { "plan_review": "auto", "spec_delta_review": "auto" },
    "chore": { "plan_review": "auto", "specify_approval": "auto" }
  }
}
```

This reduces the human bottleneck for routine work while preserving oversight where it matters. Trust can increase over time by relaxing gates in the project config.

---

## Technical Architecture

### Layer Stack

```
┌─────────────────────────────────────────────────────┐
│  Layer 5: PI INTEGRATION                            │
│  Extension entry point, event handlers, commands     │
├─────────────────────────────────────────────────────┤
│  Layer 4: WORKFLOW ENGINE                            │
│  Phase logic, autonomous loop, context builder       │
│  (orchestrates sessions, does NOT own gate logic)    │
├─────────────────────────────────────────────────────┤
│  Layer 3: TOOLS                                      │
│  LLM-callable tool implementations                   │
│  (reads from L1, checks gates via L2)                │
├─────────────────────────────────────────────────────┤
│  Layer 2: STATE + GATES                              │
│  In-memory state machine, atomic JSON persist,       │
│  gate interface + registration, transition rules     │
├─────────────────────────────────────────────────────┤
│  Layer 1: DATA                                       │
│  mdbase wrapper, type schemas, section retrieval     │
└─────────────────────────────────────────────────────┘
```

**Dependency rule:** Imports only flow downward. Never upward, never sideways.
- Layer 5 (`src/pi/`) imports from all layers
- Layer 4 (`src/workflow/`) imports from Layer 3, Layer 2, Layer 1
- Layer 3 (`src/tools/`) imports from Layer 2 and Layer 1
- Layer 2 (`src/state/`) imports from nothing internal
- Layer 1 (`src/data/`) imports from nothing internal

**Gate architecture:** Gate logic lives in Layer 2. The gate interface defines what data each gate needs and returns pass/fail:

```typescript
interface Gate {
  name: string;
  check: (data: GateCheckData) => { passed: boolean; reason?: string };
}

interface GateCheckData {
  // Provided by the caller (Layer 3)
  issueAcCount?: number;
  openQuestionsCount?: number;
  planExists?: boolean;
  planApproved?: boolean;
  humanReviewStatus?: string;           // "not-required" | "pending" | "approved" | "changes-requested"
  allAcsCovered?: boolean;
  allPlannedTasksComplete?: boolean;
  allAcsMet?: boolean;
  fullSuitePassed?: boolean;
  completionRecordExists?: boolean;
  referenceDocsReviewed?: boolean;
  milestoneUpdated?: boolean;
  systemSpecUpdated?: boolean;
  specDeltaExists?: boolean;
  moduleBlockFindings?: number;          // count of findings exceeding block threshold
  // etc.
}
```

Layer 3 (`coda_advance`):
- Reads data from Layer 1 (mdbase)
- Passes it to Layer 2's gate check as `GateCheckData`
- Returns pass/fail to the LLM

Layer 4 orchestrates (runs loops, manages sessions, builds context) but does NOT own transition rules.

### Source Structure

```
pi-coda/
├── src/
│   ├── data/              # Layer 1
│   │   ├── collection.ts    # Open/close mdbase, caching
│   │   ├── section-reader.ts# Parse ## headings, retrieve by name
│   │   ├── query-helpers.ts # Convenience: by-topic, by-issue, cross-type
│   │   └── types.ts         # TS types matching mdbase schemas
│   ├── state/             # Layer 2 (zero external deps)
│   │   ├── machine.ts       # Phase transitions, valid moves, submode transitions
│   │   ├── store.ts         # In-memory + atomic JSON read/write
│   │   ├── gates.ts         # Gate interface, gate registry, gate implementations
│   │   └── types.ts         # State shape, transition types, gate types
│   ├── tools/             # Layer 3 (pure implementations)
│   │   ├── coda-create.ts
│   │   ├── coda-update.ts
│   │   ├── coda-read.ts
│   │   ├── coda-query.ts
│   │   ├── coda-signal.ts
│   │   ├── coda-advance.ts
│   │   ├── coda-status.ts
│   │   ├── coda-run-tests.ts # Execute tests, observe results, manage TDD gate
│   │   ├── coda-edit-body.ts # Section-aware body editing for .coda/ records
│   │   └── write-gate.ts     # TDD interception + .coda/ write protection logic
│   ├── workflow/          # Layer 4
│   │   ├── phase-runner.ts   # Per-phase: context, tools, behavior
│   │   ├── build-loop.ts     # Autonomous task chaining (BUILD phase + VERIFY/correct submode)
│   │   ├── context-builder.ts# Assemble per-phase context from mdbase
│   │   ├── verify-runner.ts  # Must-haves verification (VERIFY phase)
│   │   ├── review-runner.ts  # Plan quality evaluation (REVIEW phase)
│   │   ├── unify-runner.ts   # Delta-merge + compound capture
│   │   └── ceremony.ts       # Adaptive: which phases/gates/submodes per issue type
│   ├── modules/           # Layer 3.5 (domain expertise)
│   │   ├── registry.ts      # Load enabled modules, resolve hooks by phase
│   │   ├── dispatcher.ts    # Run module hooks, collect findings, check thresholds
│   │   ├── finding-schema.ts# Validate finding output shape
│   │   └── prompts/         # Default module prompt templates
│   │       ├── security.md
│   │       ├── architecture.md
│   │       ├── api.md
│   │       ├── data.md
│   │       ├── tdd.md
│   │       ├── quality.md
│   │       ├── knowledge.md
│   │       ├── deps.md
│   │       ├── docs.md
│   │       ├── ci.md
│   │       └── ...           # Specialist modules
│   ├── pi/                # Layer 5 (only Pi-specific code)
│   │   ├── index.ts         # Extension entry: export default function(pi)
│   │   ├── commands.ts      # /coda, /coda init, /coda build, etc.
│   │   ├── hooks.ts         # before_agent_start, tool_call, agent_end
│   │   └── ui.ts            # Widget, status, dashboard
│   └── index.ts           # Re-export from pi/index.ts
├── _types/                # mdbase type schemas (copied to .coda/ on init)
├── prompts/               # Phase-specific prompt templates
├── tests/
│   ├── data/              # Unit tests, no Pi
│   ├── state/             # Pure unit tests, no Pi
│   ├── tools/             # Unit tests with mocked data/state
│   └── workflow/          # Integration tests with real mdbase
└── package.json
```

### Portability

**Project data (`.coda/` directory):** Fully portable. Markdown files + JSON. Readable by mdbase, Obsidian, grep, or any future tool. No Pi dependency.

**Layers 1-2 (data, state):** Zero external dependency on Pi. Pure TypeScript. Portable to any runtime.

**Layer 3 (tools):** Zero Pi SDK imports. Pure functions that take data/state dependencies as arguments. Portable.

**Layer 4 (workflow):** May import Pi types for `ExtensionCommandContext` etc. Minimized but present. Refactoring needed to port.

**Layer 5 (Pi integration):** Pi-specific. Replace entirely for a different host.

### Build Milestones

```
M1: Data Layer       — mdbase wrapper, type schemas, section reader, query helpers
M2: State Engine     — state machine (with submodes), atomic persist, gates, transitions, reconstruction
M3: Tool Layer       — coda_create/update/read/query/signal/advance/status/run_tests/edit_body + write-gate
M4: Module System    — registry, dispatcher, finding schema validation, 25 module prompts, project type defaults
M5: FORGE Engine     — greenfield/brownfield/additive/transformative flows, evidence gathering, gap analysis, spec checkpoints
M6: Workflow Engine  — phase runner, build loop, context builder, review runner, verify runner, unify runner, ceremony, module hook dispatch, forge-aware execution
M7: Pi Integration   — extension entry, commands, hooks, UI, prompts
```

Each milestone produces working, tested, independently useful code. M1 gives you a typed data store. M2 gives you a testable state machine. M3 gives you LLM tools testable in isolation. M4 gives you the module system with all prompts. M5 gives you the FORGE design engine. M6 gives you the orchestration brain. M7 puts it in Pi.

---

## File Structure

```
.coda/
├── mdbase.yaml                         # Collection configuration
├── coda.json                          # Project configuration
├── state.json                          # Agent process memory (gitignored)
├── _types/                             # Type schemas
│   ├── reference.md
│   ├── milestone.md
│   ├── decision.md
│   ├── issue.md
│   ├── plan.md
│   ├── task.md
│   └── record.md
│
├── reference/                          # Layer 1: Institutional knowledge
│   ├── ref-system.md                    # THE SOURCE OF TRUTH: what the system does now
│   ├── ref-prd.md                       # Why it exists, what it should become
│   ├── ref-architecture.md              # How it's built (structure, layers, data flow)
│   ├── ref-conventions.md               # How code is written (patterns, naming, testing)
│   └── ref-roadmap.md                   # When (milestones, priorities)
│
├── milestones/
│   ├── mvp-auth.md
│   └── dashboard-v1.md
│
├── modules/                            # Module prompt templates
│   ├── security.md                      # Security module prompt + finding schema
│   ├── architecture.md                  # Architecture module prompt + finding schema
│   ├── api.md                           # API contracts module prompt + finding schema
│   ├── ... (one per enabled module)
│   └── quality-history.md               # Quality baseline trends over time
│
├── forge/                             # FORGE artifacts (design layer)
│   ├── initial/                       # First FORGE (greenfield or brownfield)
│   │   ├── target-system.md
│   │   ├── DESIGN-LOG.md              # or EVIDENCE-*.md + GAP-ANALYSIS.md
│   │   ├── CHALLENGE-LOG.md
│   │   └── MILESTONE-PLAN.md
│   ├── realtime-collab/                # Example: additive FORGE
│   │   ├── target-system.md
│   │   ├── DELTA.md
│   │   ├── DESIGN-LOG.md
│   │   ├── CHALLENGE-LOG.md
│   │   ├── MILESTONE-PLAN.md
│   │   └── status.yaml
│   └── rest-to-graphql/                # Example: transformative FORGE
│       ├── target-system.md
│       ├── DELTA.md
│       ├── IMPACT-ANALYSIS.md
│       ├── MILESTONE-PLAN.md
│       └── status.yaml
│
├── decisions/                          # Decision records (accumulate)
│   ├── decision-jwt-over-session.md
│   └── decision-postgres-over-mongo.md
│
└── issues/                             # Layer 2 + 3: Per-issue artifacts
    ├── auth-login.md                   # Issue record
    ├── auth-login/
    │   ├── plan-v1.md                  # Plan (preserved on re-plan)
    │   ├── plan-v2.md                  # Plan iteration 2 (if revised)
    │   ├── tasks/
    │   │   ├── 01-auth-types.md        # Task (kind: planned)
    │   │   ├── 02-login-api.md
    │   │   ├── 03-rate-limiting.md
    │   │   ├── 04-fix-token-exp.md     # Task (kind: correction, fix_for_ac: AC-2)
    │   │   └── 05-add-validation.md    # Task (kind: correction, fix_for_ac: AC-3)
    │   └── record.md                   # Completion record
    │
    └── fix-timeout.md
```

---

## Adaptive Ceremony

| Phase | Feature | Bugfix | Refactor | Chore | Docs |
|-------|---------|--------|----------|-------|------|
| SPECIFY | Full AC + spec delta | AC = bug repro + spec delta | AC = behavior unchanged + spec delta | Lightweight | Content scope |
| Modules (pre-specify) | All enabled | Security + Architecture | Architecture | Minimal | Docs |
| PLAN | Full (must-haves, test scenarios) | Plan + repro test scenario | Plan (no new tests) | Minimal | Outline |
| Modules (pre-plan) | All enabled | All enabled | Architecture + Quality | Minimal | Docs |
| REVIEW (review ⇄ revise) | Full autonomous loop | Full loop | Lighter | Skip or minimal | Skip |
| Human plan review | Yes (default) | Configurable | No | No | No |
| BUILD | TDD per task, autonomous | TDD per task | TDD per task (existing tests) | Execute (no TDD) | Write |
| Modules (post-task/build) | All enabled | All enabled | Quality + Architecture | Quality | Docs |
| VERIFY (verify ⇄ correct) | AC evidence + spec delta check + full suite | Repro test + suite | Existing suite passes | Suite passes | Human review |
| UNIFY | Full record + spec delta merge + ref updates + compound + milestone | Record + spec delta merge + ref updates | Record + spec delta | Record | Record |

---

## Module System

### Philosophy: Three-Tier Enforcement

CODA's enforcement model has three tiers, each appropriate for different kinds of rules:

**Tier 1: Mechanical (code-enforced, cannot be bypassed)**
The process skeleton. Phase gates, TDD write-gate, `.coda/` write protection, session isolation. These prevent the classes of failure that models *predictably* cause: forgetting steps, self-reporting dishonestly, skipping inconvenient gates. Implemented as tool-layer interception.

**Tier 2: Structured Evidence (LLM judgment + required output shape)**
Domain expertise. Modules inject context prompts and require structured findings. The model does the analysis — reading code, understanding intent, making judgment calls. But it must produce evidence in a defined schema. This is the bridge between mechanical enforcement and pure instruction. The structured output is what makes the judgment *reviewable*.

**Tier 3: Pure Instruction (LLM judgment, freeform output)**
Creative work. SPECIFY conversations, plan strategy, knowledge capture. Structure would kill the value here.

Modules operate at **Tier 2**. They trust the model's intelligence but require it to show its work.

### Module Interface

```typescript
interface Module {
  name: string;                          // "security", "architecture", "api"
  domain: string;                        // human-readable domain description
  version: string;
  
  // Which hooks this module participates in
  hooks: ModuleHook[];
  
  // Reference docs this module uses for its domain knowledge
  refs: string[];                        // paths to .coda/reference/ docs
}

interface ModuleHook {
  phase: HookPoint;                      // when this runs
  priority: number;                      // ordering among modules at same hook
  
  // Rich prompt injected into the agent's context at this phase
  // This is the domain expertise — what to look for, what matters
  context_prompt: string;
  
  // Required output schema — model must produce findings in this shape
  finding_schema: FindingSchema;
  
  // What severity level triggers a block vs a warning
  block_threshold: "critical" | "high" | "medium" | "low" | "none";
}

interface Finding {
  module: string;                        // which module produced this
  file?: string;                         // affected file (if applicable)
  check: string;                         // what was checked
  severity: "critical" | "high" | "medium" | "low" | "info";
  finding: string;                       // what was found
  assumption?: string;                   // what must be true for this finding to matter (enables false-positive resolution)
  recommendation?: string;               // suggested fix
  evidence?: string;                     // supporting evidence (code snippet, command output)
}

type HookPoint =
  | "init-scan"       // During /coda init — brownfield/greenfield scanning
  | "pre-specify"     // Before SPECIFY — inject domain context for the issue
  | "pre-plan"        // Before PLAN — inject constraints and baseline assessments  
  | "post-plan"       // After PLAN — validate plan against domain rules
  | "pre-build"       // Before BUILD — establish baselines (test counts, lint state)
  | "post-task"       // After each BUILD task — incremental domain checks
  | "post-build"      // After all BUILD tasks — comprehensive domain review
  | "pre-verify"      // Before VERIFY — set up verification context
  | "post-unify";     // After UNIFY — capture domain-specific knowledge
```

### How Modules Execute

1. **Context injection:** At each hook point, the workflow engine collects enabled modules' `context_prompt` strings and includes them in the agent's system prompt. The agent reads domain expertise as natural language.
2. **Analysis:** The agent performs the analysis using its own judgment — reading code, running commands, understanding patterns. The prompt guides what to look for; the model decides what it finds.
3. **Structured output:** The agent produces findings in the required schema. The extension validates the output shape (not the content — that's the model's judgment).
4. **Threshold check:** The extension mechanically checks: does any finding exceed the module's `block_threshold`? If yes, the phase transition is blocked. If no, findings are recorded as context for the human.

The model does the hard part. The schema captures the evidence. The gate is just a threshold check on structured output.

### Standard Modules

CODA ships with a comprehensive set of domain modules. All are optional and configurable per-project.

#### Core Process Modules

| Module | Domain | Hooks | What It Does |
|--------|--------|-------|-------------|
| **tdd** | Test-Driven Development | pre-plan, post-plan, pre-build, post-task, post-build | Scans for test frameworks and coverage. Restructures tasks into RED-GREEN-REFACTOR when appropriate. Validates test-first sequencing. Runs suite after each task, blocks on regression. |
| **quality** | Quality Baseline | pre-build, post-build, post-unify | Records test/lint/typecheck baseline before BUILD. Re-runs after BUILD, blocks on regression. Tracks quality trends over time in `.coda/quality-history.md`. |
| **knowledge** | Knowledge Capture | post-build, post-unify | Extracts decisions, rationale, trade-offs from task outputs and summaries. Produces structured knowledge entries (decision records, lessons learned, rationale notes). Feeds the compounding loop. |

#### Domain Expert Modules

| Module | Domain | Hooks | What It Does |
|--------|--------|-------|-------------|
| **security** | Security Patterns | init-scan, pre-plan, post-build | Checks for hardcoded secrets, injection risks, missing auth middleware, unvalidated inputs, OWASP coverage. Blocks on hardcoded secrets or dangerous eval/exec patterns. |
| **architecture** | Structural Integrity | init-scan, pre-plan, post-build | Detects project architecture pattern (MVC, clean arch, feature-based). Flags files in wrong layers, circular dependencies, god files. Blocks on circular dependencies between planned files. |
| **api** | API Contracts | pre-plan, post-build | Identifies route/controller/schema files. Checks for breaking changes (removed endpoints, removed response fields, new required fields without deprecation). Validates input validation presence. Blocks on undeprecated breaking changes. |
| **data** | Data Layer | pre-plan, post-build | Scans for schema files, migrations, models. Checks migration safety (destructive operations on production tables), foreign key integrity, index coverage. Blocks on destructive migrations without explicit confirmation. |
| **deps** | Dependencies | init-scan, pre-plan, post-build | Detects package manager, audits for known vulnerabilities, checks for version conflicts, flags unused or outdated dependencies. Warns on dependency additions without justification. |
| **docs** | Documentation | init-scan, pre-plan, post-unify | Scans for project docs and their freshness. Flags stale docs that should be updated given the issue's changes. Checks README, CHANGELOG, API docs. |
| **ci** | CI/CD Pipeline | init-scan, pre-plan, post-build | Discovers CI config files. Checks if planned changes affect the pipeline (new test directories, changed build steps). Warns if CI config may need updating. |

#### Specialist Modules (Existing)

| Module | Domain | Hooks | What It Does |
|--------|--------|-------|-------------|
| **a11y** | Accessibility | pre-plan, post-build | Scans UI files for non-semantic interactions, missing ARIA attributes, color contrast issues, keyboard navigation gaps. Checks against WCAG guidelines. |
| **ux** | UI Components | pre-plan, post-build | Identifies component patterns (naming, prop interfaces, composition). Checks for render performance anti-patterns, missing error/loading states, inconsistent styling approaches. |
| **perf** | Performance | pre-plan, post-build | Flags N+1 queries, missing pagination on list endpoints, unbounded loops, large synchronous operations, missing caching opportunities, bundle size concerns. |
| **resilience** | Fault Tolerance | pre-plan, post-build | Checks for timeout configuration, retry logic, circuit breaker patterns, graceful degradation, error handling completeness. |
| **observability** | Logging & Monitoring | pre-plan, post-build | Checks for console.log debris, missing structured logging, absent health checks, monitoring blind spots. |
| **privacy** | Data Privacy | pre-plan, post-build | Scans for PII fields in logs, missing data retention policies, unencrypted sensitive data at rest, GDPR/compliance patterns. |
| **patterns** | Anti-Patterns | pre-plan, post-build | Flags known anti-pattern signatures: god objects, deep nesting, magic numbers, copy-paste duplication, dead code, commented-out code. |
#### Specialist Modules (New in v7)

| Module | Domain | Hooks | What It Does |
|--------|--------|-------|-------------|
| **debt** | Tech Debt | init-scan, pre-plan, post-build, post-unify | Tracks TODO/FIXME counts, high-churn files, complexity hotspots, test debt. Computes debt delta per issue. Maintains `.coda/debt-history.md`. |
| **state** | State Management | init-scan, pre-plan, post-build | Detects state management patterns (Redux, Pinia, React Context, server state, caches). Flags state anti-patterns: prop drilling, global mutation, stale closures, missing invalidation. |
| **errors** | Error Handling | init-scan, pre-plan, post-build | Detects error handling strategy. Flags swallowed errors, missing error boundaries, inconsistent error types, missing user-facing error messages. |
| **i18n** | Internationalization | init-scan, pre-plan, post-build | Detects i18n framework and translation files. Flags hardcoded user-facing strings, missing translation keys, locale coverage gaps. |
| **config** | Configuration | init-scan, pre-plan, post-build | Maps config sources (env vars, config files, feature flags, secrets managers). Flags hardcoded config values, missing env var documentation, config without defaults. |
| **integrations** | External Services | init-scan, pre-plan, post-build | Maps external service dependencies (APIs consumed, SDKs, message queues, auth providers). Flags missing error handling on external calls, missing timeouts, hardcoded URLs. |
| **migration** | Migration Safety | pre-plan, post-build | Checks for breaking changes beyond databases — API versioning, schema evolution, feature flags for staged rollout, backward compatibility, rollback paths. |
| **growth** | Scalability & Flexibility | init-scan, pre-plan, post-build, forge | Assesses coupling score, extension points, configuration flexibility, separation of concerns. The "will this inhibit future flexibility?" module. Active during FORGE design phases. |

#### FORGE Modules

During `/coda forge`, modules serve a dual role — both scanning (brownfield) and advising (greenfield/evolution):

| Module | Brownfield FORGE Role | Greenfield/Evolution FORGE Role |
|--------|-----------------------|---------------------------------|
| **architecture** | Scans structure, detects patterns, identifies boundaries | Architecture design advisor: "What are the layers? Where do boundaries go?" |
| **security** | Scans auth patterns, secret hygiene, validation coverage | Security design advisor: "Who should do what? How will users authenticate?" |
| **api** | Scans endpoints, contracts, versioning | API design advisor: "REST or GraphQL? Versioning strategy?" |
| **data** | Scans schemas, ORM, migrations | Data design advisor: "Core entities? Access patterns? Consistency needs?" |
| **deps** | Scans dependency tree, vulnerabilities, outdatedness | Tech stack advisor: "Which tools? Why?" |
| **growth** | Assesses flexibility, coupling, extension points | Growth advisor: "If this succeeds, what's next? What breaks at 10x?" |
| **quality** | Scans test coverage, lint compliance, CI gaps | Quality advisor: "Testing strategy? CI pipeline?" |
| **resilience** | Scans failure handling, timeouts, circuit breakers | Resilience advisor: "What fails? What's the recovery story?" |
| **observability** | Scans logging, monitoring, health checks | Observability advisor: "How will you know if it's healthy?" |

All modules with `init-scan` hooks also produce structured evidence files during brownfield FORGE (stored in `.coda/forge/{name}/onboarding/EVIDENCE-{module}.md`). These are the audit trail of what was found.

### Module Configuration

In `coda.json`:

```json
{
  "modules": {
    "security": { "enabled": true, "block_threshold": "critical" },
    "architecture": { "enabled": true, "block_threshold": "high" },
    "api": { "enabled": true, "block_threshold": "high" },
    "data": { "enabled": true, "block_threshold": "critical" },
    "tdd": { "enabled": true, "block_threshold": "high" },
    "quality": { "enabled": true, "block_threshold": "high" },
    "knowledge": { "enabled": true, "block_threshold": "none" },
    "deps": { "enabled": true, "block_threshold": "high" },
    "docs": { "enabled": true, "block_threshold": "none" },
    "ci": { "enabled": true, "block_threshold": "none" },
    "a11y": { "enabled": false },
    "ux": { "enabled": false },
    "perf": { "enabled": false },
    "resilience": { "enabled": false },
    "observability": { "enabled": false },
    "privacy": { "enabled": false },
    "patterns": { "enabled": true, "block_threshold": "none" },
    "debt": { "enabled": true, "block_threshold": "none" },
    "state": { "enabled": false },
    "errors": { "enabled": true, "block_threshold": "high" },
    "i18n": { "enabled": false },
    "config": { "enabled": true, "block_threshold": "high" },
    "integrations": { "enabled": true, "block_threshold": "high" },
    "migration": { "enabled": true, "block_threshold": "critical" },
    "growth": { "enabled": true, "block_threshold": "none" }
  }
}
```

Defaults: core process modules + security + architecture + api + data + deps + errors + config + integrations + migration + growth enabled. Specialist modules (a11y, ux, perf, resilience, observability, privacy, state, i18n) disabled by default — projects opt in based on relevance.

**Default module sets by project type** (detected during FORGE, human confirms):

| Project Type | Default Enabled |
|-------------|----------------|
| **REST API / Backend** | core + security, architecture, api, data, deps, docs, ci, errors, config, integrations, resilience, migration, growth, debt |
| **Frontend / SPA** | core + security, architecture, deps, docs, ci, a11y, ux, state, i18n, perf, growth, debt |
| **Full-Stack** | core + security, architecture, api, data, deps, docs, ci, errors, config, integrations, state, growth, debt |
| **CLI Tool** | core + security, architecture, deps, docs, ci, errors, config, growth, debt |
| **Library** | core + architecture, deps, docs, ci, api, patterns, growth, debt |

### Module Prompt Structure

Each module's context prompt follows a consistent pattern:

```markdown
## [Module Name] — [Hook Point]

You are checking the [domain] aspects of this [issue/task/plan].

### What to check:
[Domain-specific checklist — what matters, what to look for]

### Severity guide:
- CRITICAL: [what constitutes a hard stop]
- HIGH: [serious concern that should block]
- MEDIUM: [notable issue worth flagging]
- LOW: [minor suggestion]
- INFO: [context for the human, no action needed]

### Required output:
Produce findings as structured JSON:
{ module, file, check, severity, finding, recommendation, evidence }

If no issues found, produce a single INFO finding confirming the check was performed.
```

The prompt is the domain expertise. It evolves with the project — if `ref-conventions.md` adds a new security convention, the security module's prompt can reference it. Module prompts can reference `.coda/reference/` docs for project-specific context.

### Phase × Module Matrix

Which modules fire at which hooks:

| Hook | Core | Security | Arch | API | Data | Deps | Docs | CI | Specialist |
|------|------|----------|------|-----|------|------|------|----|------------|
| init-scan | quality | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| pre-specify | — | ✓ | ✓ | — | — | — | — | — | by topic |
| pre-plan | tdd, quality | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | by topic |
| post-plan | tdd | — | — | — | — | — | — | — | — |
| pre-build | tdd, quality | — | — | — | — | — | — | — | — |
| post-task | tdd | — | — | — | — | — | — | — | — |
| post-build | tdd, quality | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | by topic |
| pre-verify | — | — | — | — | — | — | — | — | — |
| post-unify | quality, knowledge | — | — | — | — | — | ✓ | — | — |

"by topic" = specialist modules fire only when the issue's `topics` match their domain (e.g., `a11y` fires only for issues tagged with UI-related topics).

---

## FORGE — The Design Layer

### Concept

FORGE is the spec-level design process that sits above milestones. It's how you shape what the system *is* or *becomes*, before decomposing into milestones and issues.

The hierarchy:
```
FORGE  (spec-level design)  → produces target spec + milestones
  └── Milestone              → produces issues  
        └── Issue            → CODA lifecycle (SPECIFY → BUILD → VERIFY → UNIFY)
```

You FORGE the design, then CODA through execution.

### The Home Analogy

| Home | FORGE Variant | Key Challenge |
|------|---------------|---------------|
| **Build a new home** | Greenfield | Nothing exists to remind you of structural concerns. Module advisors force you to think through plumbing, wiring, and foundations — not just the blueprint. |
| **Buy a fixer-upper** | Brownfield | Understand what's load-bearing before you touch anything. Build the spec from *evidence*, not from the realtor's description. |
| **Build an addition** | Additive | Build the new wing alongside the existing house. It stays intact the whole time. Connect when the addition is ready. |
| **Remodel a room** | Transformative | Live in the house while the kitchen is torn up. Phase the work so the home stays livable throughout. |

The distinction between addition and remodel matters:
- **Addition:** Existing spec untouched until integration milestone. New capability builds in parallel.
- **Remodel:** Spec has valid intermediate states at every milestone. System stays deployable throughout.

### The Command: `/coda forge`

```
/coda forge
  → Empty project? Greenfield flow.
  → Existing codebase, no .coda/? Brownfield flow.
  → Existing .coda/ project? Evolution flow.

/coda forge "Add real-time collaboration"     → Additive
/coda forge "Migrate REST API to GraphQL"     → Transformative
```

### Greenfield FORGE (5 phases)

```
VISION → DESIGN → CHALLENGE → DOCUMENT → SCOPE
```

**Phase 1: VISION** — Product identity. What are you building? Who uses it? What problem? Success metrics? V1 scope?

**Phase 2: DESIGN** — Module-guided architecture. Each relevant module acts as a design advisor:
- Architecture: "What are the major components? Where do boundaries go?"
- Data: "Core entities? Relationships? Access patterns?"
- Security: "Authorization model? Authentication approach? Attack surfaces?"
- API: "Core operations? REST/GraphQL/RPC? Versioning?"
- Resilience: "External dependencies? What fails? Recovery story?"
- Growth: "If this succeeds, what's next? Does the architecture support it? What breaks at 10x?"
- Observability: "How will you know if it's healthy? How will you debug production?"

**Phase 3: CHALLENGE** — Stress-test the design. Agent pushes back:
- Coupling: "X and Y are tightly coupled through Z. Acceptable?"
- Bottleneck: "All requests go through single point. At scale, this is the bottleneck."
- Missing: "You haven't addressed error handling / caching / logging."
- Assumption: "You're assuming X. If wrong, you'll need significant change."
- Flexibility: "This design choice locks you into constraint. Future need requires escape hatch."

Human can accept, revise, or defer each challenge. Deferred items become explicit assumptions.

**Phase 4: DOCUMENT** — Produce all reference docs from the design conversation.

**Phase 5: SCOPE** — First milestone. Smallest thing that proves the architecture. Highest-risk assumption to validate. Fastest path to user feedback.

### Brownfield FORGE (5 phases)

```
SCAN → SYNTHESIZE → GAP ANALYSIS → VALIDATE → ORIENT
```

**Phase 1: SCAN** — Module-driven evidence gathering. Each module scans its domain:
- architecture → directory structure, layer patterns, import graphs → EVIDENCE-architecture.md
- api → routes, endpoints, OpenAPI specs → EVIDENCE-api.md
- data → schemas, ORM models, migrations → EVIDENCE-data.md
- security → auth middleware, validation, secrets → EVIDENCE-security.md
- quality → test framework, coverage, lint config → EVIDENCE-quality.md
- deps → package managers, dependencies, vulnerabilities → EVIDENCE-deps.md
- integrations → external services, SDKs, message queues → EVIDENCE-integrations.md
- docs → documentation catalog, freshness → EVIDENCE-docs.md

Also reads universal high-signal files (README, CONTRIBUTING, git log). All evidence stored in `.coda/forge/{name}/onboarding/`.

**Phase 2: SYNTHESIZE** — Agent assembles evidence into reference docs. `ref-system.md` built bottom-up from capabilities found across all evidence files.

**Phase 3: GAP ANALYSIS** — Module-driven assessment. Not just "what exists" but "what's missing, broken, risky":
- Architecture: circular deps, god files, layer violations, dead code → structural health score
- Security: unprotected endpoints, missing validation, secret hygiene, CVEs → security posture
- Quality: test coverage gaps, lint compliance, type safety, CI gaps → quality posture
- Data: migration drift, missing indexes, orphaned relationships → data health
- API: undocumented endpoints, inconsistent patterns, breaking change risk → contract health
- Deps: outdated, vulnerable, abandoned, duplicated → dependency health
- Debt: TODO/FIXME count, churn hotspots, complexity hotspots → debt level
- Growth: coupling score, extension points, config flexibility → flexibility assessment

Produces prioritized `GAP-ANALYSIS.md` with summary dashboard, critical issues, and recommended first actions. **Recommendations are ordered by dependency, not just severity** — you can't fix the auth bug if the config system it depends on is broken. If AEGIS is available, CODA offers to escalate to a full multi-agent audit for deeper analysis.

**Phase 4: VALIDATE** — Structured human review of both system description and gap analysis. Human confirms capabilities, corrects misidentifications, validates gap priorities, adds compliance/threat-model context.

**Phase 5: ORIENT** — Future direction. Only after today's reality is documented: "Where do you want to take this? What's the biggest pain point? What should we NOT change?"

### Additive FORGE — Building an Addition (6 phases)

```
PROPOSE → DESIGN → CHALLENGE → DIFF → PLAN → APPROVE
```

Building a new wing alongside the existing house. The existing system stays intact while you build alongside it. When the addition is ready, you connect.

**Phase 1: PROPOSE** — What are we adding? Draft the new capabilities.
**Phase 2: DESIGN** — Module-guided architecture for the new capability (same advisors as greenfield).
**Phase 3: CHALLENGE** — Stress-test against the EXISTING system. "How does this interact with what we already have? Does it force changes to existing architecture?"
**Phase 4: DIFF** — Produce the spec delta: what gets ADDED to ref-system.md, what gets MODIFIED in ref-architecture.md.
**Phase 5: PLAN** — Decompose into milestones. The existing spec is untouched until the integration milestone.
**Phase 6: APPROVE** — Human commits. Milestones added to roadmap.

### Transformative FORGE — Remodeling a Room (6 phases)

```
PROPOSE → DIFF → ANALYZE → PLAN → APPROVE → EXECUTE
```

Remodeling the kitchen while you live in the house. The system must remain deployable at every step.

**Phase 1: PROPOSE** — Draft the TARGET spec — what the system looks like AFTER.
**Phase 2: DIFF** — Structured delta: current spec vs target spec. What's REMOVED, ADDED, MODIFIED.
**Phase 3: ANALYZE** — Every module runs impact assessment against the delta. Security, API, architecture, quality, integration, growth, migration modules all evaluate the transformation.
**Phase 4: PLAN** — Decompose into PHASED milestones. Each milestone has a **spec checkpoint** — what `ref-system.md` should look like after that milestone. The system spec evolves in controlled steps: current → checkpoint 1 → checkpoint 2 → target.
**Phase 5: APPROVE** — Human reviews target, impact, phasing.
**Phase 6: EXECUTE** — Milestones run through normal CODA process. SPECIFY references the forge target. VERIFY checks progress toward the checkpoint. UNIFY updates ref-system.md to the checkpoint state. Modules are forge-aware (e.g., API module stops flagging old patterns during transition).

### FORGE Artifacts

```
.coda/forge/{name}/
├── target-system.md              # The destination spec
├── target-architecture.md        # Architecture changes (if any)
├── target-conventions.md         # Convention changes (if any)
├── DELTA.md                      # Structured diff current → target
├── IMPACT-ANALYSIS.md            # Module-driven impact assessment
├── GAP-ANALYSIS.md               # Gap analysis (brownfield only)
├── DESIGN-LOG.md                 # Design advisor conversations
├── CHALLENGE-LOG.md              # Stress-test findings and responses
├── MILESTONE-PLAN.md             # Phased milestone roadmap with spec checkpoints
├── onboarding/                   # Evidence artifacts (brownfield only)
│   ├── EVIDENCE-architecture.md
│   ├── EVIDENCE-api.md
│   └── ...
└── status.yaml                   # Tracking: current milestone, progress
```

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

### FORGE Completeness Gate

Before milestones commit to the roadmap, a mechanical completeness check:

- [ ] Every milestone has success criteria defined
- [ ] Every milestone has a spec checkpoint (what ref-system.md looks like after)
- [ ] Dependencies between milestones are identified and acyclic
- [ ] Spec delta covers all proposed changes (no undocumented modifications)
- [ ] No unresolved CHALLENGE items (all accepted, revised, or explicitly deferred)
- [ ] Reference doc targets produced (target-system.md, target-architecture.md if needed)

Fails with specific missing items. The human can override but must acknowledge gaps.

### Module Project Overlays

Module prompts evolve per-project through two mechanisms:

**Structure:**
```
.coda/modules/security.md          # Default prompt (ships with CODA, read-only)
.coda/modules/security.local.md    # Project-specific overlay (grows over time)
```

The module reads BOTH files. The local overlay accumulates:

- **Validated patterns** — conventions established by completed issues ("All endpoints use Zod validation")
- **Project values** — high-level principles from FORGE ("Kernel abstraction is key", "Open source — public API stability matters")
- **Known false positives** — findings dismissed by human with context ("health endpoint is intentionally public")
- **Recurring issues** — findings flagged 2+ times without resolution ("rate limiting still missing")

**Fed by:**
- FORGE — project values and initial conventions (baseline)
- UNIFY compound step — patterns learned from completed issues
- Human feedback on findings — false positives, missed issues, corrections
- Prompt eval/tune cycle — automated improvement against accumulated eval cases

### External Tool Integration

CODA integrates with standalone tools at defined handoff points:

| Tool | Integration Point | What Happens |
|------|-------------------|-------------|
| **SEED** | Before `/coda forge` | SEED produces ideation artifacts. User invokes `/coda forge` to formalize into a project. CODA can read SEED's PLANNING.md if available. |
| **AEGIS** | During brownfield FORGE (gap analysis) | CODA offers: "Want a deep audit? Run AEGIS for full multi-agent assessment." AEGIS findings import into gap analysis. |
| **AEGIS** | Via `/coda audit` | User-triggered deep audit. AEGIS produces findings, CODA creates issues from actionable items. |
| **BASE** | Post-v1 | BASE tracks multiple CODA projects. Optional operator profile informs FORGE. |

All integrations are optional. CODA works standalone. External tools enhance specific phases when present.
---

## Tools and Commands

### Custom Tools (LLM-callable)

| Tool | Purpose |
|------|---------|
| `coda_status` | Current state (phase, submode, task progress), next action |
| `coda_advance` | Request phase transition (checks gates via Layer 2) |
| `coda_signal` | Workflow signals: `task_done` |
| `coda_query` | mdbase query (issues, tasks, decisions, references) |
| `coda_create` | Create validated mdbase record (issue, plan, task, decision, etc.) |
| `coda_update` | Update mdbase record frontmatter fields (validated, generates AC IDs) |
| `coda_read` | Read mdbase record with optional section-level body retrieval |
| `coda_edit_body` | Section-aware body editing for `.coda/` records (see contract below) |
| `coda_run_tests` | Execute test command, observe pass/fail, manage TDD gate state |

### `coda_edit_body` Contract

```typescript
coda_edit_body({
  record: string,          // mdbase record path (e.g., "issues/auth-login/tasks/01-auth-types")
  op: "append_section" | "replace_section" | "append_text",
  section?: string,        // heading name for section-based ops (e.g., "Summary", "Human Review")
  content: string,         // markdown content to write
  create_if_missing?: boolean  // default: false — if true, creates section if absent
})
```

**Semantics:**
- Reads the current record body from mdbase
- Never touches frontmatter (that's `coda_update`'s job)
- `append_section`: adds a new `## {section}` block at the end of the body
- `replace_section`: targets an existing `## {heading}` block by exact heading name, replaces its content up to the next `##` heading
- `append_text`: appends raw text to the end of the body (no heading)
- If `replace_section` targets a missing heading and `create_if_missing` is false, tool returns an error
- If heading is duplicated, tool returns an error
- Returns a diff summary of what changed

**Required usages:**
- Task completion summary: `coda_edit_body({ op: "append_section", section: "Summary", content: "...", create_if_missing: true })`
- Human review notes: `coda_edit_body({ op: "replace_section", section: "Human Review", record: plan, content: "...", create_if_missing: true })`
- UNIFY reference doc prose updates: `coda_edit_body({ op: "replace_section", section: <named section>, record: <reference doc> })`

### `coda_run_tests` Contract

```typescript
coda_run_tests({
  mode: "tdd" | "suite",     // "tdd" = per-task red/green, "suite" = full regression
  pattern?: string,           // optional filter (e.g., test file path, --testPathPattern)
})
```

**Returns:**
```typescript
{
  exit_code: number,          // 0 = pass, non-zero = fail
  passed: boolean,            // exit_code == 0
  output: string,             // stdout + stderr (truncated to context budget)
  command: string,            // the actual command that was executed
}
```

**Semantics:**
- `mode: "tdd"` uses `coda.json` → `tdd_test_command`. If `pattern` is provided, appends it to the command
- `mode: "suite"` uses `coda.json` → `full_suite_command`. `pattern` is ignored
- Extension executes the command via `pi.exec()`, records exit code and output
- **TDD gate effects (mode: "tdd" only):**
  - If `exit_code != 0` (tests failed): sets `tdd_gate = "unlocked"`, records `last_test_exit_code` and `last_test_command` in state
  - If `exit_code == 0` (tests passed): sets `tdd_gate = "locked"`, records exit code/command. Production file writes re-blocked
- **No TDD gate effects (mode: "suite"):** records result but does not change TDD gate state. Used by VERIFY for regression checks
- If the configured command is missing or empty, returns an error (never silently degrades)

### `coda_advance` Contract

```typescript
coda_advance({
  target_phase: string,       // the phase to transition to (e.g., "plan", "review", "build")
})
```

**Returns:**
```typescript
{
  success: boolean,
  previous_phase: string,
  new_phase: string,
  // On failure:
  gate_name?: string,         // which gate blocked the transition
  reason?: string,            // human-readable explanation of what's missing
}
```

**Semantics:**
- Reads required gate data from Layer 1 (mdbase) — e.g., AC count, plan approval status, completion record existence
- Passes data to Layer 2 gate check (`GateCheckData` → `Gate.check()`)
- If gate passes: updates `issue.phase` in mdbase, updates `state.json` (`phase`, resets `submode` to null, resets `loop_iteration`), returns success
- If gate fails: returns failure with `gate_name` and `reason` explaining exactly which field is missing or wrong
- Valid transitions: `specify → plan`, `plan → review`, `review → build`, `build → verify`, `verify → unify`, `unify → done`
- Backward transitions (`/coda back`): `review → plan`, `build → review`, `verify → build`, any phase → `specify`. These bypass gates but clear downstream state (e.g., back to plan clears task completion state)
- Invalid transitions return an error listing valid targets from current phase

### Commands (user-invokable)

| Command | Purpose |
|---------|---------|
| `/coda` | Show status dashboard (includes active FORGE status if any) |
| `/coda forge` | Start a FORGE process — greenfield design, brownfield onboarding, additive evolution, or transformative migration |
| `/coda new <type>` | Create issue |
| `/coda activate <id>` | Start working an issue |
| `/coda advance` | Move to next phase |
| `/coda build` | Start autonomous BUILD loop |
| `/coda pause` | Save state for later resume |
| `/coda resume` | Pick up where left off |
| `/coda back` | Rewind to prior phase (escape hatch for rescoping) |
| `/coda kill` | Set `issue.status = wont-fix`, `issue.phase = done`, clear state. Terminal |

### Event Handlers

```
before_agent_start  → inject phase/submode-specific context from mdbase
tool_call           → TDD write-gate + .coda/ write protection + VCS enforcement
agent_end           → completion detection (BUILD/VERIFY correct loop), dashboard refresh
session_start       → restore state, render dashboard
```

### Validated API Patterns (from prototype)

| Pattern | API | Notes |
|---------|-----|-------|
| Task dispatch | `pi.sendUserMessage()` | NOT `sendMessage({ triggerTurn })` — the latter bypasses `before_agent_start` |
| Completion detection | `agent_end` event + Promise | NOT `waitForIdle()` — race condition, resolves immediately |
| Context clearing | `ctx.newSession()` | Empirically proven: zero context leakage between tasks |
| Write-gate | `tool_call` → return `{ block: true, reason }` | Works reliably for both TDD and .coda/ protection |
| Context injection | `before_agent_start` → return `{ systemPrompt, message }` | Works for both system prompt mods and custom messages |

---

## Open Design Decisions (Resolved in v7)

### 1. FORGE Pause/Resume

FORGE writes artifacts to disk at every phase (`.coda/forge/{name}/`). `status.yaml` tracks the current phase. Resuming = re-read artifacts + continue.

For conversational phases (VISION, DESIGN, CHALLENGE, VALIDATE): session history provides continuity. If the session is lost, the DESIGN-LOG.md and CHALLENGE-LOG.md contain the decisions made so far — the agent re-reads them and picks up where it left off.

For autonomous phases (SCAN, SYNTHESIZE, GAP ANALYSIS): restart = re-read what's been produced, continue from where it stopped.

No special mechanism needed beyond what CODA already does for issues.

### 2. Module Prompt Evolution (Eval-Driven Development)

**Module prompts are developed via TDD for prompts:**

1. **Write eval cases first** — code snippets paired with expected findings (or expected no-findings). 20-50 cases per module.
2. **Write the prompt** — the module's context prompt and finding schema.
3. **Run eval loop** — feed snippets to model with prompt, score against expected outcomes.
4. **Iterate** — analyze failures, revise prompt, re-run. Repeat until pass rate hits threshold (95%+).
5. **Ship with evals** — eval cases ship alongside prompts in `.coda/modules/{name}/evals.json`.

**Runtime feedback loop (during project use):**
- Human reviews module findings during VERIFY/UNIFY
- "Correct finding" = positive eval case
- "False positive" = negative eval case  
- "You missed this" = new eval case the module failed
- Cases accumulate in project-local evals
- Periodic `/coda tune` runs the improvement loop against accumulated cases
- Project-local prompt evolves in `.coda/modules/{name}.md` (overrides the default)

**The eval infrastructure is built during M4 (Module System)** — it's a development tool needed to write good prompts, not a post-v1 nicety.

### Prompt Eval Tool (Standalone Utility)

The eval runner is intentionally designed as a **separable, general-purpose tool** — not buried inside CODA's module system. Any project doing agentic development benefits from the eval-iterate-ship cycle for structured prompts (system prompts, agent instructions, tool descriptions, module prompts).

Core interface:
```typescript
// Works for any prompt, not just CODA modules
promptEval({
  prompt: string,              // the prompt under test
  evalCases: EvalCase[],       // input + expected output pairs
  model?: string,              // model to test against
  schema?: FindingSchema,      // expected output shape (optional)
}) → { passRate, failures, suggestions }

promptImprove({
  prompt: string,
  evalCases: EvalCase[],
  maxIterations: number,
  targetPassRate: number,
}) → { improvedPrompt, passRate, changelog }
```

This tool lives in its own package/layer within CODA's source tree, importable independently. It's useful for:
- Developing CODA's own 25 module prompts
- Tuning module prompts per-project during runtime
- Any external project that needs to develop and maintain quality prompts

### 3. Multi-Issue Coordination

**v1: Single issue.** One active issue at a time. Design anticipates multi-issue:
- State file per worktree (not per project)
- Spec delta merges happen during UNIFY (conflicts surface at merge time)
- `/coda switch` would save current state + worktree swap

**Post-v1:** Git worktrees for parallel execution. Multiple state files. Spec delta conflict resolution during UNIFY.

### 4. Spec Drift Detection

**Git-triggered detection:** CODA knows which commits it made (they're on CODA issue branches). Any commit on main that CODA didn't make is an "untracked change."

On next issue start, the system flags: *"N untracked commits since last CODA issue. Run `/coda audit` to reconcile?"*

**`/coda audit`:** User-triggered. Runs a lightweight brownfield SCAN focused on changed files only. Diffs findings against current `ref-system.md`. Highlights discrepancies. Human confirms which changes should be reflected in the spec.

Not a full-project rescan — targeted at the untracked changes.

### 5. FORGE-to-Issue Handoff

All FORGE variants converge to the same output: **milestones on the roadmap.**

```
FORGE → MILESTONE-PLAN.md → human approves → milestones written to ref-roadmap.md
  └── Each milestone has: success criteria + spec checkpoint
      └── Issues created within milestone scope via SPECIFY (collaborative)
```

FORGE creates **milestone shells**, not issues. A milestone says *"WebSocket infrastructure — success criteria: real-time message delivery, presence detection, 100ms latency."* But it doesn't say *how* — that's what SPECIFY does for each issue.

The human creates issues within the milestone scope. SPECIFY grounds each issue against the milestone's spec checkpoint and the FORGE's target spec.

Separation: FORGE = design (what and why). Milestones = scope (how much). Issues = execution (how).

---

## Future Features (Post-v1)
- **GitHub Issues sync** — link local CODA issues to GH issues for visibility
- **Telegram/Discord notifications** — alert human when input needed
- **Semantic search** — embedding-based search over reference layer
- **Parallel issue execution** — multiple issues in parallel agent sessions with worktrees
- **Web UI** — browser-based project dashboard
- **Multi-issue coordination** — pause/resume semantics, branch switching, WIP commits
- **Prompt eval CLI** — standalone tool extracted from CODA's module eval infrastructure
---

## Status

**Validated by prototype:**
- `newSession()` task isolation (zero context leakage — secret-code test)
- `sendUserMessage()` dispatch pattern (triggers full `before_agent_start` lifecycle)
- `agent_end` completion detection (reliable across 3 loop runs + 2 interactive)
- `tool_call` write interception (blocks writes, agent receives block message and adapts)
- TDD gate block/unlock/relock mechanics (full cycle validated)
- Widget updates during autonomous loop (interactive cmux test)
- mdbase as storage layer (5 types, CRUD, queries, cross-type topic search)

**Design choices built on prototype foundation:**
- Post-task verification command pipeline
- Commit boundaries at task granularity
- Auto-fix retry policy
- Correction task generation from verification failures
- Section-aware body editing (`coda_edit_body`)
- Dependency-based carry-forward

**Design decisions made:**
- Two-layer data architecture (mdbase + atomic JSON state)
- Tool-mediated writes (LLM never writes structured fields)
- GSD2 must-haves for verification (Truths/Artifacts/Key Links) — in structured frontmatter
- Evidence-based TDD via `coda_run_tests` (no self-reporting fallback)
- `.coda/` write protection enforced at tool layer
- Gate logic in Layer 2 (State), not Layer 4 (Workflow)
- REVIEW and VERIFY as proper phases with submodes (review/revise, verify/correct)
- Correction tasks as regular tasks with `kind: correction` (unified pipeline)
- Stable AC IDs for traceability
- OpenSpec delta-merge for living documentation (via `coda_update` + `coda_edit_body` diffs)
- Compound Engineering knowledge capture in UNIFY
- Adaptive ceremony by issue type (from specs.md FIRE)
- PALS-style requirement traceability in SPECIFY
- Brownfield via module-driven SCAN in `/coda init` (v1, not deferred)
- Dependency-based carry-forward (not just recency)
- Durable human plan review artifact (`plan.human_review_status`)
- No partial completion escape hatch — rescope via `/coda back` instead
- Separated test commands: `tdd_test_command`, `full_suite_command`, `verification_commands`
- **(v6): `ref-system.md` as authoritative source of truth** — spec deltas drafted during SPECIFY, merged during UNIFY. Code is derivative; the spec is the product.
- **(v6): Three-tier enforcement model** — mechanical skeleton (Tier 1), structured evidence via modules (Tier 2), LLM judgment (Tier 3). Lean on model intelligence, constrain the process.
- **(v6): Module system** — domain-expert modules with structured findings and block thresholds.
- **NEW (v7): FORGE as the design layer** — `/coda forge` unifies greenfield init, brownfield onboarding, additive evolution, and transformative migration. One command, four backdrops. The home analogy: new home, fixer-upper, addition, remodel.
- **NEW (v7): 25 modules** (up from 17) — added debt, state, errors, i18n, config, integrations, migration, growth. Modules serve as design advisors during FORGE and domain checkers during issues.
- **NEW (v7): Brownfield gap analysis** — module-driven assessment producing prioritized GAP-ANALYSIS.md with health scores per domain.
- **NEW (v7): Greenfield design facilitation** — module-driven architecture advisors with CHALLENGE phase for stress-testing.
- **NEW (v7): Spec checkpoints** — transformative FORGEs have intermediate spec states per milestone. System spec evolves in controlled, validated steps.
- **NEW (v7): Project type detection** — default module sets for REST API, Frontend, Full-Stack, CLI, Library.
- **NEW (v7, from AEGIS): `assumption` field on findings** — "what must be true for this to matter." Enables fast false-positive resolution without discarding observations.
- **NEW (v7, from AEGIS): Dependency-aware gap analysis ordering** — recommendations sequenced by dependency, not severity. Optional AEGIS escalation for deep audit.
- **NEW (v7, from AEGIS): Per-project module overlays** — `.local.md` files accumulate project-specific patterns, values, and false positives via UNIFY and human feedback.
- **NEW (v7, from AEGIS): Risk metadata on tasks** — `risk_level: low|medium|high` derived from modules during PLAN. High-risk tasks get stricter verification.
- **NEW (v7, from SEED): FORGE completeness gate** — mechanical checklist before milestones commit to roadmap.
- **NEW (v7): Ecosystem integration points** — SEED (ideation → forge), AEGIS (deep audit → gap analysis / audit), BASE (multi-project, post-v1).

**Informed by comparison of 8+ frameworks + 3 ecosystem tools:** Kiro, Spec Kit, GSD2, PALS (18 modules), Megapowers, Compound Engineering, specs.md, OpenSpec, BASE, SEED, AEGIS.
**Ready for:** Implementation planning.
