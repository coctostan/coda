# v0.3: Module Prompts — Security + TDD (v0.3.1 adds Architecture, Quality, Knowledge)

**Location:** `modules/prompts/` (monorepo root)
**Depends on:** Nothing (these are markdown data files)

## Overview

**v0.3 ships 2 modules** (security + tdd, 5 prompt files). v0.3.1 adds architecture, quality, and knowledge (7 more prompt files). Prompts tell the LLM what to check and how to report findings. The structured output requirement (JSON findings array) is appended by the dispatcher — prompt authors write domain expertise, not output formatting.

## Prompt Structure Convention

Every module prompt follows this pattern:

```markdown
## [Module Name] — [Hook Point Description]

You are checking [domain] aspects of [what: this plan / these changes / this issue].

### Context
[What you have access to and what you're evaluating]

### What to Check
[Numbered checklist of domain-specific concerns]

### Severity Guide
- **CRITICAL:** [definition for this module]
- **HIGH:** [definition]
- **MEDIUM:** [definition]
- **LOW:** [definition]
- **INFO:** [purely informational, no action needed]

### Assumption Guidance
For each finding, state what must be true for this finding to matter.
Example: "Assumes this endpoint handles user data" or "Assumes production deployment."
If the assumption is wrong, the finding can be dismissed without debate.
```

The JSON output requirement block is appended automatically by the dispatcher. Don't include it in the prompt itself.

---

## Module 1: Security

**Hooks:** pre-plan (priority 80), post-build (priority 130)

### `modules/prompts/security/pre-plan.md`

Injected before PLAN begins. Assesses security implications of the planned work.

**Key checks:**
1. Do any files in scope handle authentication or authorization?
2. Do any files process user input that could be injection vectors?
3. Are there secret/credential patterns in planned files?
4. Does the issue's scope touch security-sensitive areas (auth, payments, PII)?

**Severity guide:**
- CRITICAL: Hardcoded secrets, credentials in source
- HIGH: Missing auth on sensitive endpoints, SQL injection risk
- MEDIUM: Missing input validation, weak password patterns
- LOW: Console.log with potentially sensitive data

### `modules/prompts/security/post-build.md`

Injected after BUILD completes. Reviews actual code changes.

**Key checks:**
1. Hardcoded secrets (API keys, passwords, tokens in source)
2. Injection risks (eval, exec, innerHTML, raw SQL interpolation)
3. Auth middleware presence on new endpoints
4. Input validation on new endpoints (Zod, Joi, etc.)
5. Sensitive data in logs

**Severity guide:** Same as pre-plan but applied to actual code, not planned files.

---

## Module 2: Architecture

**Hooks:** pre-plan (priority 75), post-build (priority 125)

### `modules/prompts/architecture/pre-plan.md`

Assesses structural implications before planning.

**Key checks:**
1. Do planned files cross established layer boundaries?
2. Are new files in the expected directory for their purpose?
3. Will the planned approach create circular dependencies?
4. Are any planned files already >500 lines (god file risk)?

### `modules/prompts/architecture/post-build.md`

Reviews structural changes after BUILD.

**Key checks:**
1. Import direction: do imports flow in the expected direction (downward)?
2. New files: are they in the right layer/directory?
3. File size: did any file grow beyond 500 lines?
4. Responsibility creep: did any file grow by >100 lines?
5. New circular dependencies introduced?

**Severity guide:**
- CRITICAL: Circular dependency between core modules
- HIGH: Layer boundary violation (e.g., data layer importing from UI)
- MEDIUM: File exceeding 500 lines, responsibility creep
- LOW: File in slightly unexpected location

---

## Module 3: TDD

**Hooks:** pre-build (priority 100), post-task (priority 100), post-build (priority 200)

### `modules/prompts/tdd/pre-build.md`

Upgraded from v0.1 todd.ts prompt. Injected before each BUILD task.

**Key checks:**
1. Remind of RED-GREEN-REFACTOR cycle
2. Explain write-gate mechanics (production writes blocked until failing test)
3. List anti-patterns: writing production code first, testing after, skipping edge cases

### `modules/prompts/tdd/post-task.md`

Injected after each task completes.

**Key checks:**
1. Were tests written before production code? (check file modification timestamps if possible)
2. Do tests cover the task's test scenarios from the task record?
3. Are tests testing behavior (what) or implementation (how)?
4. Any tests that always pass regardless of implementation (tautological tests)?

### `modules/prompts/tdd/post-build.md`

Injected after all tasks complete.

**Key checks:**
1. Run full test suite
2. Coverage check: are all ACs covered by at least one test?
3. Suggest REFACTOR candidates from changed files (complexity, duplication)

**Severity guide:**
- HIGH: Tests don't cover an AC, tautological test found
- MEDIUM: Test tests implementation instead of behavior
- LOW: Refactor opportunity
- INFO: Coverage summary

---

## Module 4: Quality

**Hooks:** pre-build (priority 100), post-build (priority 100), post-unify (priority 100)

### `modules/prompts/quality/pre-build.md`

Upgraded from v0.1 walt.ts prompt. Establishes baseline.

**Key checks:**
1. Run test suite, record baseline (total/passing/failing)
2. Run lint if configured, record baseline
3. Run typecheck if configured, record baseline

### `modules/prompts/quality/post-build.md`

Regression check after BUILD.

**Key checks:**
1. Re-run test suite. Compare against baseline.
2. Re-run lint. Compare against baseline.
3. Re-run typecheck. Compare against baseline.
4. Any regressions? (new failures, new warnings, new type errors)

**Severity guide:**
- HIGH: Test regression (was passing, now failing)
- HIGH: New type errors
- MEDIUM: New lint warnings
- LOW: Test count didn't increase (might indicate missing tests)
- INFO: Quality summary (before vs after)

### `modules/prompts/quality/post-unify.md`

Quality delta for the completion record.

**Key checks:**
1. Compute quality delta: tests before/after, lint before/after, typecheck before/after
2. Record trend: improving, stable, or declining
3. Produce a markdown table for the completion record

---

## Module 5: Knowledge

**Hooks:** post-build (priority 300), post-unify (priority 200)

### `modules/prompts/knowledge/post-build.md`

Capture decisions made during BUILD.

**Key checks:**
1. Were any design decisions made during tasks that aren't documented?
2. Were any trade-offs made (performance vs readability, etc.)?
3. Were any patterns established that should become conventions?

**Severity guide:**
- INFO only — knowledge module never blocks

### `modules/prompts/knowledge/post-unify.md`

Compound step: extract learnings for the project.

**Key checks:**
1. What patterns emerged from this issue?
2. What conventions should be documented?
3. What decision records should be created?
4. What lessons learned should be captured?

---

## File Layout

```
modules/prompts/
├── security/
│   ├── pre-plan.md
│   └── post-build.md
├── architecture/
│   ├── pre-plan.md
│   └── post-build.md
├── tdd/
│   ├── pre-build.md
│   ├── post-task.md
│   └── post-build.md
├── quality/
│   ├── pre-build.md
│   ├── post-build.md
│   └── post-unify.md
└── knowledge/
    ├── post-build.md
    └── post-unify.md
```

**Total: 12 prompt files across 5 modules.**

## Tests

Prompt tests are lightweight in v0.3 (no eval engine yet):
1. Each prompt file exists and is non-empty
2. Each prompt file contains the module name and hook description
3. Each prompt file contains a "What to Check" section
4. Each prompt file contains a "Severity Guide" section
5. Module definition hooks match the prompt files that exist
