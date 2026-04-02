# E2E Real Project Test — Fully Autonomous via CMUX

## Overview

An agent executes this script entirely via CMUX pane commands. No human intervention. The agent plays both roles: the "human PM" (providing context, approving work, driving phase transitions) and the test observer (checking results, documenting findings).

**Project:** A TODO CLI tool in TypeScript/bun.
**Location:** `~/pi/workspace/coda-test-todo` (fixed path for easy inspection)
**Output:** A findings report written to `E2E-REAL-PROJECT-FINDINGS.md` in the coda project directory.

## Instructions for the Executing Agent

You are running this test by sending commands to a CMUX pane where Pi+CODA is running. You observe the output, verify checkpoints, and document everything. When CODA needs input, you provide it by sending messages to the pane.

**Rules:**
1. After every `cmux send`, wait and then `cmux read-screen` to observe the result
2. Record PASS/FAIL for each checkpoint in your findings
3. If something fails, document the exact error and continue (don't stop)
4. Use generous sleep times — the inner Pi agent needs time to think and execute
5. Write your findings report as you go

---

## Setup

```bash
# 1. Clean workspace (remove if exists from prior run)
rm -rf ~/pi/workspace/coda-test-todo
mkdir -p ~/pi/workspace/coda-test-todo
cd ~/pi/workspace/coda-test-todo

# 2. Init bare project
cat > package.json << 'PKGJSON'
{ "name": "todo-cli", "type": "module", "scripts": { "test": "bun test" }, "bin": { "todo": "./src/cli.ts" } }
PKGJSON
cat > tsconfig.json << 'TSCONF'
{ "compilerOptions": { "strict": true, "target": "ESNext", "module": "ESNext", "moduleResolution": "bundler" } }
TSCONF
mkdir -p src tests
git init && git add -A && git commit -m "init bare project"

# 3. Start CMUX pane with Pi+CODA
cmux new-split --name coda --size 60
cmux send coda "cd ~/pi/workspace/coda-test-todo && pi -e /Users/maxwellnewman/pi/workspace/coda/packages/coda/src/pi/index.ts --model 'openai/gpt-5.4-mini' --thinking high"
sleep 15
cmux read-screen coda
```

**Checkpoint SETUP-1:** Pi loaded without errors? Record result.

---

## Phase 1: FORGE (Scaffold + Populate)

### Step 1.1: Scaffold .coda/

```bash
cmux send coda "/coda forge"
sleep 15
cmux read-screen coda
```

This scaffolds the `.coda/` directory structure and creates `coda.json`. It does NOT interactively ask questions — it creates the structure and returns guidance.

**Checkpoint FORGE-1:** Verify scaffold:
```bash
cmux send coda "Run: ls -la .coda/ && echo '---' && cat .coda/coda.json"
sleep 10
cmux read-screen coda
```

- [ ] `.coda/` directory exists
- [ ] `coda.json` exists

### Step 1.2: Update coda.json with test commands

The scaffold may not have the test commands set. Update them:

```bash
cmux send coda 'Use coda_update on the coda config — actually, the test commands need to be set. Run this: cat .coda/coda.json to check if tdd_test_command is set.'
sleep 10
cmux read-screen coda
```

If not set, have the agent fix it:
```bash
cmux send coda 'The project uses bun test. Update .coda/coda.json so tdd_test_command is "bun test" and full_suite_command is "bun test". Since this is a config file, you can write it directly — it is not a .coda/ mdbase record.'
sleep 10
```

### Step 1.3: Create reference docs

Since forge is scaffold-only, create the reference docs via tools:

```bash
cmux send coda 'Use coda_create to create a reference doc: type "reference", title "System Spec", category "system", topics ["todo-cli"]. Body should describe what this system will be: "## Capabilities\n\nNone yet — project initializing.\n\n## Overview\n\nA command-line TODO list manager for personal use. TypeScript/bun. Commands: add, list, done, remove. Local JSON storage."'
sleep 15
cmux read-screen coda
```

```bash
cmux send coda 'Use coda_create to create a reference doc: type "reference", title "Product Requirements", category "prd", topics ["todo-cli"]. Body: "## Purpose\n\nPersonal task management from the command line.\n\n## Users\n\nSingle user, local only.\n\n## V1 Scope\n\n- add: create todo with description\n- list: show all todos\n- done: mark complete by ID\n- remove: delete by ID\n- JSON file storage\n\n## Out of Scope\n\nPriorities, tags, due dates, categories, network sync."'
sleep 15
cmux read-screen coda
```

**Checkpoint FORGE-2:** Verify ref docs:
```bash
cmux send coda "Run: ls .coda/reference/"
sleep 5
cmux read-screen coda
```

- [ ] ref-system.md (or system-spec.md) exists
- [ ] ref-prd.md (or product-requirements.md) exists

---

## Phase 2: SPECIFY

### Step 2.1: Create the issue

```bash
cmux send coda 'Use coda_create to create an issue: type "issue", title "Implement Core Todo Commands", issue_type "feature", status "active", phase "specify", priority 2, topics ["todo-cli"], acceptance_criteria [{id: "AC-1", text: "todo add <desc> creates a todo with sequential ID and incomplete status", status: "pending"}, {id: "AC-2", text: "todo list shows all todos with ID, status, and description", status: "pending"}, {id: "AC-3", text: "todo done <id> marks a todo as complete", status: "pending"}, {id: "AC-4", text: "todo remove <id> deletes a todo", status: "pending"}, {id: "AC-5", text: "Todos persist in a JSON file between invocations", status: "pending"}], open_questions [], human_review false, spec_delta {added: ["Add todo command", "List todos command", "Complete todo command", "Remove todo command", "JSON persistence"], modified: [], removed: [], delta_summary: "Adds core todo CLI commands with local JSON storage"}'
sleep 20
cmux read-screen coda
```

**Checkpoint SPECIFY-1:**
```bash
cmux send coda "Use coda_status to show current state"
sleep 10
cmux read-screen coda
```

- [ ] Issue created with 5 ACs
- [ ] Spec delta present

### Step 2.2: Advance to PLAN

```bash
cmux send coda 'Use coda_advance to move to phase "plan"'
sleep 10
cmux read-screen coda
```

- [ ] Gate passes (ACs exist, no open questions)
- [ ] Phase is now "plan"

---

## Phase 3: PLAN

### Step 3.1: Create plan and tasks

```bash
cmux send coda 'Create a plan for this issue. Use coda_create to create: type "plan", title "Todo CLI Implementation Plan", issue "implement-core-todo-commands", status "draft", iteration 1, task_count 3, human_review_status "not-required". Body: "## Approach\n\nThree tasks: (1) Todo type + JSON storage layer, (2) CLI argument parsing + add/list commands, (3) done/remove commands. TDD throughout."'
sleep 15
```

```bash
cmux send coda 'Use coda_create for task 1: type "task", id 1, issue "implement-core-todo-commands", title "Todo type and JSON storage", status "pending", kind "planned", covers_ac ["AC-1", "AC-5"], files_to_modify ["src/types.ts", "src/storage.ts"], truths ["Todo has id, description, status fields", "Storage reads and writes JSON file", "IDs are sequential"], artifacts [{path: "src/types.ts", description: "Todo interface"}, {path: "src/storage.ts", description: "JSON file storage"}], key_links []. Body: "## Objective\nCreate Todo type and JSON storage layer.\n\n## Test Scenarios\n- Create a todo, read it back, fields match\n- Storage creates file if missing\n- IDs increment sequentially\n- Data persists after write"'
sleep 15
```

```bash
cmux send coda 'Use coda_create for task 2: type "task", id 2, issue "implement-core-todo-commands", title "CLI with add and list commands", status "pending", kind "planned", covers_ac ["AC-1", "AC-2"], depends_on [1], files_to_modify ["src/cli.ts"], truths ["add command creates a todo via storage", "list command shows all todos with formatting"], artifacts [{path: "src/cli.ts", description: "CLI entry point"}], key_links [{from: "src/cli.ts", to: "src/storage.ts", via: "import of addTodo, getAllTodos"}]. Body: "## Objective\nImplement CLI arg parsing with add and list subcommands.\n\n## Test Scenarios\n- add with description creates todo\n- list shows todos with ID, status, description\n- list on empty store shows appropriate message"'
sleep 15
```

```bash
cmux send coda 'Use coda_create for task 3: type "task", id 3, issue "implement-core-todo-commands", title "Done and remove commands", status "pending", kind "planned", covers_ac ["AC-3", "AC-4"], depends_on [1, 2], files_to_modify ["src/cli.ts", "src/storage.ts"], truths ["done command marks todo complete", "remove command deletes todo"], artifacts [], key_links []. Body: "## Objective\nAdd done and remove subcommands.\n\n## Test Scenarios\n- done <id> marks status complete\n- done with invalid id shows error\n- remove <id> deletes todo\n- remove with invalid id shows error"'
sleep 15
```

### Step 3.2: Approve plan and advance

```bash
cmux send coda 'Use coda_update on "issues/implement-core-todo-commands/plan-v1" to set status "approved"'
sleep 10
cmux send coda 'Use coda_advance to move to phase "review"'
sleep 10
cmux send coda 'Use coda_advance to move to phase "build"'
sleep 10
cmux read-screen coda
```

**Checkpoint PLAN-1:**
- [ ] Plan and 3 tasks created
- [ ] Phase is now "build"

---

## Phase 4: BUILD (Agent-Driven TDD)

The autonomous build loop is not wired as a Pi command. Instead, tell the agent to execute tasks manually using TDD:

```bash
cmux send coda 'You are now in BUILD phase with 3 tasks to complete. For EACH task, follow strict TDD:

1. Read the task with coda_read to understand what to build
2. Write test files FIRST (tests/ directory)
3. Run coda_run_tests with mode "tdd" to confirm tests FAIL
4. Write production code (src/ directory) — the TDD gate only allows this after a failing test
5. Run coda_run_tests with mode "tdd" to confirm tests PASS
6. Mark the task complete with coda_update (set status "complete")
7. Use coda_edit_body to add a Summary section to the task record
8. Then move to the next task

Start with task 1: Todo type and JSON storage. Read it first with coda_read.'
sleep 30
cmux read-screen coda
```

**Monitor BUILD progress.** Check every 30-60 seconds:

```bash
sleep 60
cmux read-screen coda
```

```bash
sleep 60
cmux read-screen coda
```

```bash
sleep 60
cmux read-screen coda
```

Continue monitoring until the agent has completed all 3 tasks. If the agent seems stuck or asks a question, answer it.

If the agent completes task 1 but doesn't automatically start task 2:
```bash
cmux send coda "Task 1 complete. Now start task 2: CLI with add and list commands. Read it with coda_read first."
sleep 30
```

After task 2:
```bash
cmux send coda "Task 2 complete. Now start task 3: Done and remove commands."
sleep 30
```

**Checkpoint BUILD-1:** After all tasks complete:
```bash
cmux send coda "Use coda_status to show current state"
sleep 10
cmux send coda "Run: git log --oneline"
sleep 5
cmux send coda "Run: bun test"
sleep 10
cmux read-screen coda
```

- [ ] All 3 tasks status "complete"
- [ ] src/ has types.ts, storage.ts, cli.ts (or similar)
- [ ] tests/ has test files
- [ ] `bun test` passes
- [ ] Git log shows commits

### Step 4.2: Advance to VERIFY

```bash
cmux send coda 'Use coda_advance to move to phase "verify"'
sleep 10
cmux read-screen coda
```

- [ ] Gate passes (all tasks complete)
- [ ] Phase is now "verify"

---

## Phase 5: VERIFY

Tell the agent to verify ACs:

```bash
cmux send coda 'You are in VERIFY phase. Check each acceptance criterion against the built code:

AC-1: Does "todo add <desc>" create a todo with sequential ID and incomplete status?
AC-2: Does "todo list" show all todos with ID, status, description?
AC-3: Does "todo done <id>" mark a todo complete?
AC-4: Does "todo remove <id>" delete a todo?
AC-5: Do todos persist in a JSON file between invocations?

Run the full test suite with coda_run_tests mode "suite". Check the code exists. Then update each AC status to "met" or "not-met" using coda_update on the issue.'
sleep 45
cmux read-screen coda
```

If any ACs are not-met, let the agent fix them. If all met:

```bash
cmux send coda 'Use coda_advance to move to phase "unify"'
sleep 10
cmux read-screen coda
```

**Checkpoint VERIFY-1:**
- [ ] All ACs marked "met"
- [ ] Phase is now "unify"

---

## Phase 6: UNIFY

```bash
cmux send coda 'You are in UNIFY phase. Do these things:
1. Create a completion record with coda_create (type "record", title "Completion: Core Todo Commands", issue "implement-core-todo-commands", completed_at today, reference_docs_reviewed true, system_spec_updated true)
2. Update ref-system.md using coda_edit_body — replace the Capabilities section with the actual capabilities built (add, list, done, remove commands + JSON persistence)
3. Then advance to done.'
sleep 30
cmux read-screen coda
```

**Checkpoint UNIFY-1:**
```bash
cmux send coda "Run: cat .coda/reference/ref-system*.md 2>/dev/null || cat .coda/reference/system-spec*.md 2>/dev/null"
sleep 10
cmux read-screen coda
```

- [ ] Completion record exists
- [ ] ref-system.md now describes the todo CLI capabilities
- [ ] Phase is "done"

---

## Phase 7: FUNCTIONAL VERIFICATION

Test the actual CLI:

```bash
cmux send coda 'Run: bun src/cli.ts add "Buy groceries"'
sleep 5
cmux read-screen coda

cmux send coda 'Run: bun src/cli.ts add "Walk the dog"'
sleep 5

cmux send coda 'Run: bun src/cli.ts list'
sleep 5
cmux read-screen coda

cmux send coda 'Run: bun src/cli.ts done 1'
sleep 5

cmux send coda 'Run: bun src/cli.ts list'
sleep 5
cmux read-screen coda

cmux send coda 'Run: bun src/cli.ts remove 2'
sleep 5

cmux send coda 'Run: bun src/cli.ts list'
sleep 5
cmux read-screen coda
```

**Checkpoint FUNC-1:**
- [ ] `add` creates todos with IDs
- [ ] `list` shows todos
- [ ] `done` marks complete
- [ ] `remove` deletes
- [ ] Data persists between commands

---

## Findings Report

Write `E2E-REAL-PROJECT-FINDINGS.md` to the coda project directory:

```markdown
# E2E Real Project Test — Findings

**Date:** [date]
**Test dir:** ~/pi/workspace/coda-test-todo
**Model:** [model used by inner Pi agent]

## Results Summary
| Phase | Result |
|-------|--------|
| FORGE | |
| SPECIFY | |
| PLAN | |
| REVIEW | |
| BUILD | |
| VERIFY | |
| UNIFY | |
| FUNCTIONAL | |

## Checkpoints
[Each checkpoint with PASS/FAIL and evidence]

## Issues Found
[Any bugs, unexpected behavior, or friction points]

## Agent Experience Observations
[How did the inner agent interact with CODA tools? Was TDD gate intuitive?
Did context help? What felt broken?]

## Artifacts
[List .coda/ files, git commits, source files]
```

## Teardown

```bash
cmux send coda "/exit"
sleep 3
cmux close coda
# Keep ~/pi/workspace/coda-test-todo for inspection
```

---

*Script version: real-project-v3 (fully autonomous, scaffold-based forge, agent-driven BUILD)*
*Estimated time: 30-60 minutes*
