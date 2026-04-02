# E2E Real Project Test — CODA Builds a TODO CLI

## What This Tests

CODA managing a real project from forge through a completed issue. Not simulated tool calls — a real agent writing real code, enforced by CODA's lifecycle.

## The Project: todo-cli

A simple TypeScript CLI tool:
- `todo add "buy milk"` — creates a todo item
- `todo list` — shows all todos
- `todo done 1` — marks todo #1 complete
- `todo remove 1` — deletes todo #1
- Storage: JSON file at `~/.todos.json`
- Tests: bun test

Small enough for one issue, complex enough to exercise TDD and multiple tasks.

## Prerequisites

- All LIVE-01 through LIVE-10 fixes applied
- All existing tests still passing
- CMUX available
- Capable model (Sonnet 4 or better)

## Setup

```bash
# Create the project directory
mkdir -p ~/pi/workspace/todo-cli
cd ~/pi/workspace/todo-cli

# Init basic project
echo '{ "name": "todo-cli", "type": "module", "scripts": { "test": "bun test" }, "bin": { "todo": "./src/cli.ts" } }' > package.json
echo '{ "compilerOptions": { "strict": true, "target": "ESNext", "module": "ESNext", "moduleResolution": "bundler" } }' > tsconfig.json
git init && git add -A && git commit -m "init"

# Open CMUX pane
cmux new-split --name coda-real --size 60

# Start Pi with CODA extension
cmux send coda-real "cd ~/pi/workspace/todo-cli && pi -e /Users/maxwellnewman/pi/workspace/coda/packages/coda/src/pi/index.ts"
sleep 10
```

---

## Phase 1: FORGE (Project Initialization)

### Step 1.1: Run /coda forge

```bash
cmux send coda-real "/coda forge"
sleep 5
```

**What should happen:**
- CODA detects no `.coda/` directory → greenfield flow
- Asks questions about the project

**Respond to questions:**

```bash
# When asked "What are you building?":
cmux send coda-real "A CLI tool for managing personal todo items. TypeScript, runs with bun."
sleep 10

# When asked "Who uses this?":
cmux send coda-real "Me, personally. Simple command-line todo management."
sleep 10

# When asked about tech stack:
cmux send coda-real "TypeScript with bun runtime. Tests with bun test. No dependencies beyond bun built-ins."
sleep 10

# When asked about scope:
cmux send coda-real "v1: add, list, done, remove commands. JSON file storage. That's it. No priorities, no tags, no due dates."
sleep 10

# When asked about test command:
cmux send coda-real "bun test for both TDD and full suite."
sleep 10
```

**Verify:**
- [ ] `.coda/` directory created
- [ ] `.coda/coda.json` exists with `tdd_test_command: "bun test"` and `full_suite_command: "bun test"`
- [ ] `.coda/reference/ref-system.md` exists with capabilities section
- [ ] `.coda/reference/ref-prd.md` exists
- [ ] At least one milestone created
- [ ] `coda_status` shows initialized state

```bash
cmux send coda-real "Run: ls -la .coda/ && cat .coda/coda.json"
sleep 5
cmux read-screen coda-real
```

---

## Phase 2: SPECIFY (Create and Specify an Issue)

### Step 2.1: Create the issue

```bash
cmux send coda-real "/coda new feature"
sleep 5

# When prompted for title/description:
cmux send coda-real "Implement core todo commands: add, list, done, remove. Each command should work from the CLI with clear output. Todos stored in a JSON file."
sleep 15
```

**What should happen:**
- Agent enters SPECIFY phase
- Agent asks clarifying questions about the feature
- Agent drafts acceptance criteria

**Respond to agent questions and guide toward these ACs:**

```bash
# Guide the conversation toward these ACs:
# AC-1: `todo add "description"` creates a todo with sequential ID and "incomplete" status
# AC-2: `todo list` shows all todos with ID, status, and description
# AC-3: `todo done <id>` marks a todo as complete
# AC-4: `todo remove <id>` deletes a todo
# AC-5: Todos persist in ~/.todos.json between invocations

# Let the agent lead, but steer if needed:
cmux send coda-real "Those ACs look good. I'd add: AC-5 for persistence - todos should survive between CLI invocations via a JSON file. Also draft the spec delta - what capabilities are we adding to ref-system.md?"
sleep 15
```

### Step 2.2: Approve ACs and advance

```bash
cmux send coda-real "ACs look complete. Advance to plan."
sleep 10
cmux read-screen coda-real
```

**Verify:**
- [ ] Issue created with 4-5 ACs (each has stable ID)
- [ ] Spec delta drafted (ADDED capabilities)
- [ ] Phase advances to PLAN
- [ ] `coda_status` shows phase: plan

---

## Phase 3: PLAN (Agent Plans the Work)

### Step 3.1: Let the agent plan

```bash
# Agent should autonomously create plan + tasks
# Wait for it to complete
sleep 30
cmux read-screen coda-real
```

**Verify:**
- [ ] Plan record created (`.coda/issues/{slug}/plan-v1.md`)
- [ ] Tasks created (expect 2-4 tasks covering all ACs)
- [ ] Each task has covers_ac referencing AC IDs
- [ ] Each task has test scenarios and files_to_modify
- [ ] Phase advances to REVIEW

---

## Phase 4: REVIEW (Autonomous Review)

### Step 4.1: Let review run

```bash
# Review should run autonomously
sleep 30
cmux read-screen coda-real
```

**Verify:**
- [ ] Review checks AC coverage, dependency ordering
- [ ] If issues found → revision instructions written → revise runs → re-review
- [ ] Plan ends up approved
- [ ] Human review gate: if feature type → should pause for human approval

### Step 4.2: Approve plan (if human review gate fires)

```bash
cmux send coda-real "Plan looks good. Approve."
sleep 10
```

**Verify:**
- [ ] Phase advances to BUILD
- [ ] Feature branch created (git branch shows feat/{slug})

---

## Phase 5: BUILD (The Main Event — TDD Loop)

### Step 5.1: Start autonomous build

```bash
cmux send coda-real "/coda build"
sleep 5
```

**What should happen:**
For each task:
1. New session with task context
2. Agent writes test first (test file → allowed by TDD gate)
3. Agent runs `coda_run_tests` → tests fail → TDD gate unlocks
4. Agent writes production code (now allowed)
5. Agent runs `coda_run_tests` → tests pass → TDD gate re-locks
6. Task summary written
7. Git commit

**Monitor progress:**
```bash
# Check periodically:
cmux read-screen coda-real
# Also check git log:
cmux send coda-real "Run: git log --oneline"
sleep 5
```

**This is the longest phase — expect 5-15 minutes depending on model.**

**Verify (after BUILD completes):**
- [ ] All tasks completed (check `.coda/` task records)
- [ ] Test files exist (in tests/ or __tests__/)
- [ ] Production code exists (src/cli.ts, src/storage.ts, etc.)
- [ ] Git log shows one commit per task
- [ ] `bun test` passes from the command line
- [ ] Phase advances to VERIFY

```bash
cmux send coda-real "Run: bun test"
sleep 10
cmux send coda-real "Run: git log --oneline"
sleep 5
cmux read-screen coda-real
```

---

## Phase 6: VERIFY (Check ACs Against Reality)

### Step 6.1: Let verify run

```bash
# Verify should run autonomously
sleep 30
cmux read-screen coda-real
```

**What should happen:**
- Agent checks each AC against the built code
- Runs full test suite
- Marks each AC as met or not-met

**If verify finds unmet ACs:**
- Correction tasks generated
- BUILD loop runs on correction tasks
- Re-verify

**Verify:**
- [ ] All ACs marked "met"
- [ ] Full test suite passes
- [ ] Phase advances to UNIFY
- [ ] If corrections were needed: correction tasks visible in tasks/ directory

---

## Phase 7: UNIFY (Close the Loop)

### Step 7.1: Let UNIFY run

```bash
# UNIFY should run autonomously
sleep 30
cmux read-screen coda-real
```

**Verify:**
- [ ] Completion record created (`.coda/issues/{slug}/record.md`)
- [ ] ref-system.md updated with new capabilities (spec delta merged)
- [ ] Phase advances to DONE

```bash
cmux send coda-real "Run: cat .coda/reference/ref-system.md"
sleep 5
cmux read-screen coda-real
```

**Verify ref-system.md now describes the todo CLI capabilities:**
- [ ] Lists add, list, done, remove commands
- [ ] Mentions JSON storage

---

## Phase 8: Functional Verification

### Step 8.1: Does the CLI actually work?

```bash
# Test the actual built CLI
cmux send coda-real 'Run: bun src/cli.ts add "Buy groceries"'
sleep 5
cmux send coda-real 'Run: bun src/cli.ts add "Walk the dog"'
sleep 5
cmux send coda-real 'Run: bun src/cli.ts list'
sleep 5
cmux send coda-real 'Run: bun src/cli.ts done 1'
sleep 5
cmux send coda-real 'Run: bun src/cli.ts list'
sleep 5
cmux send coda-real 'Run: bun src/cli.ts remove 2'
sleep 5
cmux send coda-real 'Run: bun src/cli.ts list'
sleep 5
cmux read-screen coda-real
```

**Verify:**
- [ ] add creates todos with sequential IDs
- [ ] list shows todos with ID, status, description
- [ ] done marks a todo complete (shows in list)
- [ ] remove deletes a todo
- [ ] Data persists between invocations

---

## Summary Checklist

| Phase | Test | Result | Notes |
|-------|------|--------|-------|
| FORGE | .coda/ scaffolded | | |
| FORGE | ref-system.md created | | |
| FORGE | coda.json has test commands | | |
| SPECIFY | Issue created with ACs | | |
| SPECIFY | Spec delta drafted | | |
| SPECIFY→PLAN gate | Advances with ACs | | |
| PLAN | Plan + tasks created | | |
| PLAN | AC coverage complete | | |
| REVIEW | Autonomous review runs | | |
| REVIEW | Plan approved | | |
| BUILD | TDD cycle works (test first) | | |
| BUILD | Multiple tasks execute sequentially | | |
| BUILD | Git commits per task | | |
| BUILD | All tests pass | | |
| VERIFY | ACs checked against code | | |
| VERIFY | All ACs met | | |
| UNIFY | Completion record created | | |
| UNIFY | ref-system.md updated | | |
| FUNCTIONAL | CLI add works | | |
| FUNCTIONAL | CLI list works | | |
| FUNCTIONAL | CLI done works | | |
| FUNCTIONAL | CLI remove works | | |
| FUNCTIONAL | Persistence works | | |

**Total: 23 verification points**

## What This Proves (If It Passes)

1. **CODA can manage a real project from zero to working software**
2. **The agent experience works** — context injection helps, TDD gate doesn't fight the agent
3. **The lifecycle produces real artifacts** — spec, plan, tasks, code, tests, completion record
4. **The spec stays current** — ref-system.md reflects what was actually built
5. **The code actually works** — not just "tests pass" but "the CLI does what it should"

## Teardown

```bash
cmux send coda-real "/exit"
sleep 3
cmux close coda-real
# Keep todo-cli directory for inspection — don't delete
```

---

*Script version: real-project-v1 — 2026-04-01*
*Project: todo-cli (TypeScript CLI)*
*Estimated time: 30-60 minutes (depends on model speed)*
