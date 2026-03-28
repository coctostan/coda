# M4: Modules (v0.1) — Todd + Walt

**Package:** `coda` → `src/modules/`
**Depends on:** Nothing (pure prompt injection)

## v0.1 Scope

Two modules lifted from PALS, adapted for CODA. No module infrastructure (registry, dispatcher, eval engine) — just markdown prompts injected at the right moments.

## Todd (TDD Module)

**Purpose:** Enforce test-driven development during BUILD.

**Hook points:**
- `pre-build`: Injected into the BUILD task's system prompt

**v0.1 prompt (injected before each task):**

```markdown
## TDD Enforcement

You MUST follow the RED-GREEN cycle for this task:

1. Write a failing test FIRST that covers the task's test scenarios
2. Run `coda_run_tests({ mode: "tdd" })` to confirm the test fails
3. Only AFTER seeing a failing test can you write production code
4. Write the minimum production code to make the test pass
5. Run `coda_run_tests({ mode: "tdd" })` to confirm it passes

The write-gate enforces this mechanically:
- Production file writes are BLOCKED until you have a failing test
- After tests pass, production file writes are re-blocked
- You must write the next test before writing more production code

If a task has no testable behavior (e.g., config changes), note this
explicitly and proceed without TDD.
```

**Mechanical enforcement:** The TDD write-gate in M3 handles the actual blocking. Todd's prompt explains the protocol to the LLM so it understands why writes are blocked.

## Walt (Quality Baseline Module)

**Purpose:** Run test suite + verification commands after BUILD tasks to catch regressions.

**Hook points:**
- `post-task`: Run after each BUILD task completes
- `post-build`: Run after all tasks complete

**v0.1 behavior:**

After each task:
1. Run `coda_run_tests({ mode: "suite" })` — full test suite
2. Run verification commands from config (lint, typecheck)
3. If anything fails: flag to the agent with output

This is NOT the mechanical TDD gate — it's a quality check. Todd enforces write order. Walt checks that the full suite still passes after changes.

**v0.1 prompt (injected after each task):**

```markdown
## Post-Task Quality Check

After completing this task, verify quality:

1. Run the full test suite: `coda_run_tests({ mode: "suite" })`
2. If tests fail, fix regressions before proceeding
3. Run any verification commands configured in coda.json
   (typically: lint, typecheck)
4. If verification fails, fix issues before proceeding

Do NOT advance to the next task until all checks pass.
```

## Implementation

In v0.1, modules are just strings injected into the system prompt by the workflow engine at the right moment. No registry, no finding schema, no dispatch system.

```typescript
// In workflow/context-builder.ts (M6):
function getModulePrompts(hookPoint: string): string[] {
  const prompts: string[] = [];
  if (hookPoint === 'pre-build') {
    prompts.push(TODD_PRE_BUILD_PROMPT);
  }
  if (hookPoint === 'post-task' || hookPoint === 'post-build') {
    prompts.push(WALT_POST_TASK_PROMPT);
  }
  return prompts;
}
```

## Files

```
packages/coda/src/modules/
├── todd.ts          # TDD prompt constant
└── walt.ts          # Quality baseline prompt constant
```

## Tests

Minimal — these are just string constants in v0.1. Test that:
- `getModulePrompts('pre-build')` includes Todd's prompt
- `getModulePrompts('post-task')` includes Walt's prompt
- `getModulePrompts('pre-plan')` returns empty (no modules at this hook yet)
