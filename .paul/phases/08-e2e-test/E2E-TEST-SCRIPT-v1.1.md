# E2E Test Script v1.1 — CODA Full Lifecycle Test

## What This Tests

A complete issue lifecycle from forge through done on a real test project. Tests every gate, every tool, the TDD write-gate cycle, spec delta merge, and VCS integration.

## Prerequisites

- Pi CLI installed globally (`pi` command available)
- CMUX installed and working (`cmux` command available)
- Model API key configured (any capable model)
- CODA repo at `/Users/maxwellnewman/pi/workspace/coda` with all 186 tests passing
- `bun install` completed in workspace root
- `@coda/core` symlink in place (`node_modules/@coda/core` → `../../packages/core`)

## Setup

```bash
# 1. Create test project directory
export TEST_DIR=$(mktemp -d -t coda-e2e-XXXX)
cd $TEST_DIR

# 2. Init a basic Node/TS project
echo '{ "name": "coda-test-project", "type": "module", "scripts": { "test": "bun test", "lint": "echo lint-ok" } }' > package.json
echo '{ "compilerOptions": { "strict": true, "target": "ESNext", "module": "ESNext", "moduleResolution": "bundler" } }' > tsconfig.json
mkdir -p src tests
git init && git add -A && git commit -m "init test project"

# 3. Open CMUX pane
cmux new-split --name e2e --size 60

# 4. Start Pi with CODA extension
cmux send e2e "cd $TEST_DIR && pi -e /Users/maxwellnewman/pi/workspace/coda/packages/coda/src/pi/index.ts"
sleep 10
```

---

## Part 1: Extension Loading & Basic Health

### Step 1.1: Extension loads without errors

```bash
cmux read-screen e2e
```

**Verify:**
- [ ] Pi session active (prompt visible)
- [ ] No "Cannot determine intended module format" errors
- [ ] No "failed to load extension" errors
- [ ] No unresolved dependency errors

---

### Step 1.2: /coda command works

```bash
cmux send e2e "/coda"
sleep 5
cmux read-screen e2e
```

**Verify:**
- [ ] Shows CODA status output
- [ ] Shows "No active issue" or equivalent
- [ ] No errors

---

### Step 1.3: coda_status tool works

```bash
cmux send e2e "Use coda_status to check the current project status"
sleep 10
cmux read-screen e2e
```

**Verify:**
- [ ] Agent calls coda_status
- [ ] Returns JSON with focus_issue: null, phase: null, enabled: true
- [ ] No tool execution errors

---

## Part 2: FORGE (Project Initialization)

### Step 2.1: Scaffold .coda/ directory

For v0.1 we manually scaffold since forge interactive flow is a placeholder.

```bash
# Create the .coda structure manually (simulating forge output)
cmux send e2e "Run these bash commands to set up .coda: mkdir -p .coda/reference .coda/issues .coda/milestones"
sleep 5
```

Then create the config and reference docs:

```bash
cmux send e2e 'Write a file .coda/coda.json with this content: { "tdd_test_command": "bun test", "full_suite_command": "bun test", "verification_commands": ["echo lint-ok"], "tdd_gate": { "feature": true } }'
sleep 10
```

**Wait — this should be blocked by the write-gate!**

**Verify:**
- [ ] Write to `.coda/coda.json` is BLOCKED
- [ ] Agent gets message: "Use coda_* tools to modify .coda/ files"

Good — the write-gate works. Now use the tools:

```bash
cmux send e2e "Use coda_create to create a reference doc with type 'reference', title 'System Spec', category 'system', topics ['todo-cli']. Set the body to: '## Capabilities\n\nNone yet — project initializing.'"
sleep 15
cmux read-screen e2e
```

**Verify:**
- [ ] coda_create succeeds
- [ ] File created at `.coda/reference/system-spec.md`
- [ ] Frontmatter has correct fields
- [ ] Body has ## Capabilities section

---

### Step 2.2: Verify .coda/ write protection (negative test)

```bash
cmux send e2e "Write the text 'HACKED' to the file .coda/reference/system-spec.md"
sleep 10
cmux read-screen e2e
```

**Verify:**
- [ ] Write is BLOCKED by tool_call hook
- [ ] File content unchanged
- [ ] Agent receives block reason

```bash
cmux send e2e "Edit .coda/reference/system-spec.md and add a line 'HACKED' at the end"
sleep 10
cmux read-screen e2e
```

**Verify:**
- [ ] Edit is also BLOCKED (both write AND edit intercepted)

---

### Step 2.3: Create coda.json via scaffold (workaround for v0.1)

Since coda_create is for mdbase records and coda.json is config, we need to write it outside .coda/ or use a scaffold command. For this test, write it before starting Pi:

```bash
# Exit Pi, write config, restart
cmux send e2e "/exit"
sleep 3

# Write config directly (Pi not running, no write-gate)
cat > $TEST_DIR/.coda/coda.json << 'EOF'
{
  "tdd_test_command": "bun test",
  "full_suite_command": "bun test",
  "verification_commands": [],
  "tdd_gate": { "feature": true, "bugfix": true, "chore": false }
}
EOF

# Also create ref-system.md manually for the test
cat > $TEST_DIR/.coda/reference/ref-system.md << 'EOF'
---
title: System Spec
category: system
topics: [todo-cli]
---

## Capabilities

None yet — project initializing.
EOF

# Restart Pi with extension
cmux send e2e "pi -e /Users/maxwellnewman/pi/workspace/coda/packages/coda/src/pi/index.ts"
sleep 10
```

---

## Part 3: Issue Creation & SPECIFY Phase

### Step 3.1: Create an issue

```bash
cmux send e2e "Use coda_create to create an issue with these fields: type 'issue', title 'Add Todo Item', issue_type 'feature', status 'active', phase 'specify', priority 2, topics ['todo-cli'], acceptance_criteria [], open_questions [], human_review true. Body: 'Users should be able to add a new todo item.'"
sleep 15
cmux read-screen e2e
```

**Verify:**
- [ ] Issue created successfully
- [ ] Returns path (e.g., `.coda/issues/add-todo-item.md`)
- [ ] coda_status now shows focus_issue and phase

---

### Step 3.2: Update issue with ACs (SPECIFY output)

```bash
cmux send e2e "Use coda_update to update the issue 'issues/add-todo-item' with these fields: acceptance_criteria [{id: 'AC-1', text: 'Running add with a description creates a new todo in the JSON file', status: 'pending'}, {id: 'AC-2', text: 'New todos have status incomplete and a sequential ID', status: 'pending'}], open_questions [], spec_delta {added: ['Add todo item command'], modified: [], removed: [], delta_summary: 'Adds the ability to create new todo items'}"
sleep 15
cmux read-screen e2e
```

**Verify:**
- [ ] coda_update succeeds
- [ ] coda_read confirms ACs are set with IDs
- [ ] spec_delta is stored

---

### Step 3.3: Gate test — SPECIFY → PLAN (should PASS)

```bash
cmux send e2e "Use coda_advance to move to phase 'plan'"
sleep 10
cmux read-screen e2e
```

**Verify:**
- [ ] Gate passes (ACs exist, no open questions)
- [ ] Phase transitions to 'plan'
- [ ] coda_status confirms phase: plan

---

### Step 3.4: Gate test — SPECIFY → PLAN with missing ACs (negative test)

This was already tested implicitly — but to be thorough, create a second issue with empty ACs and try to advance:

```bash
cmux send e2e "Use coda_create to create an issue: type 'issue', title 'Bad Issue', issue_type 'feature', status 'active', phase 'specify', acceptance_criteria [], open_questions ['what should this do?']"
sleep 10
cmux send e2e "Use coda_advance to move to phase 'plan'"
sleep 10
cmux read-screen e2e
```

**Verify:**
- [ ] Gate FAILS with reason: "Issue must have at least one acceptance criterion"
- [ ] Phase remains 'specify'

---

## Part 4: PLAN Phase

### Step 4.1: Create a plan

```bash
cmux send e2e "Use coda_create with type 'plan', title 'Plan for Add Todo', issue 'add-todo-item', status 'draft', iteration 1, task_count 2, human_review_status 'not-required'. Body: 'Two tasks: create the data model, then implement the add command.'"
sleep 15
```

**Verify:**
- [ ] Plan created at `.coda/issues/add-todo-item/plan-v1.md`

---

### Step 4.2: Create tasks

```bash
cmux send e2e "Use coda_create with type 'task', id 1, issue 'add-todo-item', title 'Create Todo data model', status 'pending', kind 'planned', covers_ac ['AC-1', 'AC-2'], files_to_modify ['src/types.ts', 'src/storage.ts'], truths ['Todo has id, description, status fields', 'Storage reads/writes JSON file'], artifacts [{path: 'src/types.ts', description: 'Todo type definition'}, {path: 'src/storage.ts', description: 'JSON file read/write'}], key_links []. Body: '## Objective\nCreate the Todo type and storage layer.\n\n## Test Scenarios\n- Create a todo, read it back, fields match\n- Storage file created if missing'"
sleep 15
```

```bash
cmux send e2e "Use coda_create with type 'task', id 2, issue 'add-todo-item', title 'Implement add command', status 'pending', kind 'planned', covers_ac ['AC-1'], depends_on [1], files_to_modify ['src/cli.ts'], truths ['add command creates todo via storage'], artifacts [{path: 'src/cli.ts', description: 'CLI entry with add command'}], key_links [{from: 'src/cli.ts', to: 'src/storage.ts', via: 'import of addTodo'}]. Body: '## Objective\nImplement the add subcommand.\n\n## Test Scenarios\n- Run add with description, todo appears in storage'"
sleep 15
```

**Verify:**
- [ ] Tasks created at `.coda/issues/add-todo-item/tasks/01-create-todo-data-model.md` and `02-implement-add-command.md`
- [ ] coda_read confirms both tasks exist

---

### Step 4.3: Approve plan and advance to REVIEW

```bash
cmux send e2e "Use coda_update on 'issues/add-todo-item/plan-v1' to set status 'approved'"
sleep 5
cmux send e2e "Use coda_advance to move to phase 'review'"
sleep 10
cmux read-screen e2e
```

**Verify:**
- [ ] Gate passes (plan exists)
- [ ] Phase transitions to 'review'

---

## Part 5: REVIEW Phase (v0.1 single-pass)

### Step 5.1: Advance through review to build

In v0.1, review is single-pass — just advance to build after the plan is approved.

```bash
cmux send e2e "Use coda_advance to move to phase 'build'"
sleep 10
cmux read-screen e2e
```

**Verify:**
- [ ] Gate passes (plan approved)
- [ ] Phase transitions to 'build'
- [ ] coda_status shows phase: build

---

## Part 6: BUILD Phase — TDD Write-Gate Cycle

**This is the most important test section.**

### Step 6.1: Verify TDD gate is locked

```bash
cmux send e2e "Use coda_status to check the TDD gate state"
sleep 10
cmux read-screen e2e
```

**Verify:**
- [ ] tdd_gate shows "locked"

---

### Step 6.2: Try to write production code (should be BLOCKED)

```bash
cmux send e2e "Write a file src/types.ts with this content: export interface Todo { id: number; description: string; status: string; }"
sleep 10
cmux read-screen e2e
```

**Verify:**
- [ ] Write is BLOCKED by TDD gate
- [ ] Agent receives: "TDD gate locked. Write a failing test first, then run coda_run_tests."
- [ ] `src/types.ts` does NOT exist

---

### Step 6.3: Write a test file (should be ALLOWED)

```bash
cmux send e2e "Write a file tests/types.test.ts with this content:\nimport { describe, test, expect } from 'bun:test';\nimport { Todo } from '../src/types';\n\ndescribe('Todo type', () => {\n  test('has required fields', () => {\n    const todo: Todo = { id: 1, description: 'test', status: 'incomplete' };\n    expect(todo.id).toBe(1);\n    expect(todo.description).toBe('test');\n    expect(todo.status).toBe('incomplete');\n  });\n});"
sleep 10
cmux read-screen e2e
```

**Verify:**
- [ ] Write to test file is ALLOWED (test files bypass TDD gate)
- [ ] `tests/types.test.ts` exists

---

### Step 6.4: Run failing test → TDD gate unlocks

```bash
cmux send e2e "Use coda_run_tests with mode 'tdd' to run the tests"
sleep 15
cmux read-screen e2e
```

**Verify:**
- [ ] Tests run and FAIL (src/types.ts doesn't exist yet)
- [ ] exit_code is non-zero
- [ ] passed is false
- [ ] **TDD gate is now UNLOCKED**

```bash
cmux send e2e "Use coda_status to check TDD gate state"
sleep 5
```

**Verify:**
- [ ] tdd_gate shows "unlocked"

---

### Step 6.5: Write production code (should now be ALLOWED)

```bash
cmux send e2e "Write a file src/types.ts with this content: export interface Todo { id: number; description: string; status: 'incomplete' | 'complete'; }"
sleep 10
cmux read-screen e2e
```

**Verify:**
- [ ] Write is ALLOWED (gate is unlocked)
- [ ] `src/types.ts` exists with correct content

---

### Step 6.6: Run passing test → TDD gate re-locks

```bash
cmux send e2e "Use coda_run_tests with mode 'tdd' to run the tests"
sleep 15
cmux read-screen e2e
```

**Verify:**
- [ ] Tests PASS
- [ ] exit_code is 0
- [ ] passed is true
- [ ] **TDD gate is now LOCKED again**

```bash
cmux send e2e "Use coda_status to check TDD gate state"
sleep 5
```

**Verify:**
- [ ] tdd_gate shows "locked"

---

### Step 6.7: Try to write more production code (should be BLOCKED again)

```bash
cmux send e2e "Write a file src/storage.ts with content: export function saveTodo() {}"
sleep 10
cmux read-screen e2e
```

**Verify:**
- [ ] Write is BLOCKED again (gate re-locked after tests passed)
- [ ] Full TDD cycle confirmed: locked → test fails → unlocked → code written → test passes → locked

---

## Part 7: coda_edit_body & coda_update

### Step 7.1: Edit body with section operations

```bash
cmux send e2e "Use coda_edit_body on record 'issues/add-todo-item/tasks/01-create-todo-data-model' with op 'append_section', section 'Summary', content 'Created Todo type and storage layer. Files: src/types.ts, src/storage.ts', create_if_missing true"
sleep 10
cmux read-screen e2e
```

**Verify:**
- [ ] Section appended to task body
- [ ] coda_read confirms ## Summary section exists

---

### Step 7.2: Update task status

```bash
cmux send e2e "Use coda_update on 'issues/add-todo-item/tasks/01-create-todo-data-model' to set status 'complete'"
sleep 10
```

**Verify:**
- [ ] Task frontmatter updated
- [ ] coda_read confirms status: complete

---

## Part 8: VERIFY Phase

### Step 8.1: Complete remaining tasks and advance to verify

Mark task 2 complete (skip the full TDD cycle for it in this test):

```bash
cmux send e2e "Use coda_update on 'issues/add-todo-item/tasks/02-implement-add-command' to set status 'complete'"
sleep 5
cmux send e2e "Use coda_advance to move to phase 'verify'"
sleep 10
cmux read-screen e2e
```

**Verify:**
- [ ] Gate passes (all planned tasks complete)
- [ ] Phase transitions to 'verify'

---

### Step 8.2: Gate test — verify → unify with unmet ACs (negative)

```bash
cmux send e2e "Use coda_advance to move to phase 'unify'"
sleep 10
cmux read-screen e2e
```

**Verify:**
- [ ] Gate FAILS — ACs still have status 'pending', not 'met'
- [ ] Reason mentions "acceptance criteria must be met"

---

### Step 8.3: Mark ACs as met and advance

```bash
cmux send e2e "Use coda_update on 'issues/add-todo-item' to set acceptance_criteria [{id: 'AC-1', text: 'Running add with a description creates a new todo in the JSON file', status: 'met'}, {id: 'AC-2', text: 'New todos have status incomplete and a sequential ID', status: 'met'}]"
sleep 10
cmux send e2e "Use coda_advance to move to phase 'unify'"
sleep 10
```

**Verify:**
- [ ] Gate passes (all ACs met)
- [ ] Phase transitions to 'unify'

---

## Part 9: UNIFY Phase

### Step 9.1: Create completion record

```bash
cmux send e2e "Use coda_create with type 'record', title 'Completion: Add Todo Item', issue 'add-todo-item', completed_at '2026-03-28', topics ['todo-cli'], reference_docs_reviewed true, system_spec_updated true, milestone_updated false. Body: '## Summary\nAdded todo item creation with TDD-enforced development.\n\n## Spec Delta Applied\n- ADDED: Add todo item command'"
sleep 15
```

**Verify:**
- [ ] Completion record created at `.coda/issues/add-todo-item/record.md`

---

### Step 9.2: Update ref-system.md (spec delta merge)

```bash
cmux send e2e "Use coda_edit_body on 'reference/ref-system' with op 'replace_section', section 'Capabilities', content '- Add todo item: creates a new todo with sequential ID and incomplete status, stored in JSON file'"
sleep 10
cmux read-screen e2e
```

**Verify:**
- [ ] ref-system.md updated with the new capability
- [ ] coda_read confirms the Capabilities section has content

---

### Step 9.3: Advance to done

```bash
cmux send e2e "Use coda_advance to move to phase 'done'"
sleep 10
cmux read-screen e2e
```

**Verify:**
- [ ] Gate passes (completion record exists)
- [ ] Phase transitions to 'done'
- [ ] **FULL LIFECYCLE COMPLETE**

---

### Step 9.4: Gate test — unify → done without completion record (negative)

To test this, we'd need a second issue. If time permits:

```bash
# Create a quick second issue, rush it to unify, try to advance without record
# ... (optional, skip if time-constrained)
```

---

## Part 10: VCS Integration

### Step 10.1: Verify git state

```bash
cmux send e2e "Run: git log --oneline"
sleep 5
cmux read-screen e2e
```

**Verify:**
- [ ] Commits exist from task completion (if build loop created them)
- [ ] Or at minimum, the initial commit exists and working tree has changes

---

## Part 11: Full Test Suite (regression)

### Step 11.1: Run coda_run_tests in suite mode

```bash
cmux send e2e "Use coda_run_tests with mode 'suite'"
sleep 15
cmux read-screen e2e
```

**Verify:**
- [ ] Full suite command runs
- [ ] Returns exit_code, passed, output, command
- [ ] Does NOT affect TDD gate state (suite mode)

---

## Summary Checklist

Copy this to E2E-FINDINGS-v1.1.md and fill in results:

| # | Test | Result | Notes |
|---|------|--------|-------|
| 1.1 | Extension loads | | |
| 1.2 | /coda command | | |
| 1.3 | coda_status tool | | |
| 2.1 | coda_create reference doc | | |
| 2.2 | .coda/ write protection (write + edit) | | |
| 2.3 | Config setup | | |
| 3.1 | Create issue | | |
| 3.2 | Update issue with ACs + spec_delta | | |
| 3.3 | Gate: specify→plan (pass) | | |
| 3.4 | Gate: specify→plan (fail - no ACs) | | |
| 4.1 | Create plan | | |
| 4.2 | Create tasks | | |
| 4.3 | Advance to review | | |
| 5.1 | Advance review→build | | |
| 6.1 | TDD gate initially locked | | |
| 6.2 | Production write BLOCKED | | |
| 6.3 | Test file write ALLOWED | | |
| 6.4 | Failing test → gate UNLOCKS | | |
| 6.5 | Production write ALLOWED | | |
| 6.6 | Passing test → gate RE-LOCKS | | |
| 6.7 | Production write BLOCKED again | | |
| 7.1 | coda_edit_body section append | | |
| 7.2 | coda_update task status | | |
| 8.1 | Advance to verify | | |
| 8.2 | Gate: verify→unify (fail - ACs pending) | | |
| 8.3 | ACs met → advance to unify | | |
| 9.1 | Create completion record | | |
| 9.2 | Spec delta merge (edit ref-system.md) | | |
| 9.3 | Advance to done | | |
| 10.1 | Git log | | |
| 11.1 | coda_run_tests suite mode | | |

**Total tests: 31** (vs v1's 8)

## Teardown

```bash
cmux send e2e "/exit"
sleep 3
cmux close e2e
rm -rf $TEST_DIR
```

---

*Script version: v1.1 — 2026-03-28*
*Tests: 31 steps covering full lifecycle + gate enforcement + TDD cycle + spec delta merge*
*Estimated time: 30-45 minutes*
