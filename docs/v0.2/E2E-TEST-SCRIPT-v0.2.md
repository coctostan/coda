# E2E Test Script v0.2 — Autonomous Loops

## What This Tests

The four v0.2 scenarios that MUST work:
1. Review finds a flawed plan and recovers it (review/revise loop)
2. Verify finds unmet ACs and creates correction tasks (verify/correct loop)
3. Exhaustion path pauses correctly
4. Human review gate blocks BUILD when pending

## Prerequisites

- v0.1 E2E passing clean (all 31 steps)
- v0.2 code built and unit tests passing
- CMUX available
- Test project from v0.1 E2E or fresh one

## Setup

```bash
export TEST_DIR=$(mktemp -d -t coda-v02-e2e-XXXX)
cd $TEST_DIR

# Init test project
echo '{ "name": "coda-v02-test", "type": "module", "scripts": { "test": "bun test", "lint": "echo lint-ok" } }' > package.json
mkdir -p src tests
git init && git add -A && git commit -m "init"

# Scaffold .coda/ manually
mkdir -p .coda/reference .coda/issues .coda/milestones
cat > .coda/coda.json << 'EOF'
{
  "tdd_test_command": "bun test",
  "full_suite_command": "bun test",
  "verification_commands": [],
  "tdd_gate": { "feature": true },
  "human_review_default": { "feature": true },
  "max_review_iterations": 2,
  "max_verify_iterations": 2
}
EOF

cat > .coda/reference/ref-system.md << 'EOF'
---
title: System Spec
category: system
topics: [calculator]
---
## Capabilities
None yet.
EOF

# Start Pi with CODA
cmux new-split --name e2e --size 60
cmux send e2e "cd $TEST_DIR && pi -e /Users/maxwellnewman/pi/workspace/coda/packages/coda/src/pi/index.ts"
sleep 10
```

---

## Scenario 1: Review Catches a Flawed Plan

**Goal:** Create an issue with ACs, then make a plan with an intentional flaw (missing AC coverage). Verify the review loop catches it and the revise loop fixes it.

### Step 1.1: Create issue with ACs

```bash
cmux send e2e "Use coda_create to create an issue: type 'issue', title 'Add Calculator', issue_type 'feature', status 'active', phase 'specify', priority 2, topics ['calculator'], acceptance_criteria [{id: 'AC-1', text: 'Can add two numbers', status: 'pending'}, {id: 'AC-2', text: 'Can subtract two numbers', status: 'pending'}, {id: 'AC-3', text: 'Returns error for non-numeric input', status: 'pending'}], open_questions [], human_review true"
sleep 15
# Bootstrap focused CODA runtime state so coda_advance has an active issue
cat > .coda/state.json << 'EOF'
{
  "version": 1,
  "focus_issue": "add-calculator",
  "phase": "specify",
  "submode": null,
  "loop_iteration": 0,
  "current_task": null,
  "completed_tasks": [],
  "tdd_gate": "locked",
  "last_test_exit_code": null,
  "task_tool_calls": 0,
  "enabled": true
}
EOF
cmux send e2e "Use coda_advance to move to phase 'plan'"
sleep 10
```

**Verify:**
- [ ] Issue created with 3 ACs
- [ ] Phase advances to plan

### Step 1.2: Create a FLAWED plan (missing AC-3 coverage)

```bash
cmux send e2e "Use coda_create: type 'plan', title 'Calculator Plan', issue 'add-calculator', status 'draft', iteration 1, task_count 2, human_review_status 'not-required'"
sleep 10

# Task 1 covers AC-1 only
cmux send e2e "Use coda_create: type 'task', id 1, issue 'add-calculator', title 'Implement addition', status 'pending', kind 'planned', covers_ac ['AC-1'], files_to_modify ['src/calc.ts'], truths ['add(2,3) returns 5']. Body: '## Test Scenarios\n- add(2,3) = 5\n- add(-1,1) = 0'"
sleep 10

# Task 2 covers AC-2 only — AC-3 NOT COVERED by any task
cmux send e2e "Use coda_create: type 'task', id 2, issue 'add-calculator', title 'Implement subtraction', status 'pending', kind 'planned', covers_ac ['AC-2'], depends_on [1], files_to_modify ['src/calc.ts'], truths ['subtract(5,3) returns 2']. Body: '## Test Scenarios\n- subtract(5,3) = 2'"
sleep 10

cmux send e2e "Use coda_advance to move to phase 'review'"
# Expected trigger behavior: successful `coda_advance` into `review` runs the deterministic review runner immediately.
# If issues are found, CODA writes `revision-instructions.md`, switches state to `review/revise`,
# and queues the revise turn automatically as a Pi follow-up message.
sleep 10
```

**Verify:**
- [ ] Plan and 2 tasks created
- [ ] Phase advances to review
- [ ] Submode should be "review"

### Step 1.3: Review should detect missing AC-3 coverage

```bash
# Wait for the autonomous review session to run
# The supported operator trigger is the `coda_advance` call above plus the extension-managed follow-up turn.
sleep 30
cmux read-screen e2e
```

**Verify:**
- [ ] Review detects AC-3 has no task covering it
- [ ] Revision instructions written to disk
- [ ] Submode transitions to "revise"
- [ ] Check: `ls .coda/issues/add-calculator/revision-instructions.md`

```bash
cmux send e2e "Run: cat .coda/issues/add-calculator/revision-instructions.md"
sleep 5
cmux read-screen e2e
```

**Verify:**
- [ ] Revision instructions mention AC-3 missing coverage

### Step 1.4: Revise should fix the plan

```bash
# Wait for revise session to run
# The revise turn should already be queued automatically by the review trigger path.
sleep 30
cmux read-screen e2e
```

**Verify:**
- [ ] Agent creates or updates a task to cover AC-3
- [ ] Submode transitions back to "review"
- [ ] loop_iteration incremented to 1

### Step 1.5: Re-review should approve

```bash
# Wait for re-review
# Re-review should also be reached through the same extension-managed follow-up chain.
sleep 30
cmux read-screen e2e
```

**Verify:**
- [ ] Plan status set to "approved"
- [ ] Since human_review: true, should pause for human approval
- [ ] coda_status shows: phase review, plan approved, human_review_status pending

---

## Scenario 2: Human Review Gate

**Goal:** Verify the human review gate blocks BUILD when status is "pending".

### Step 2.1: Try to advance to BUILD (should be BLOCKED)

```bash
cmux send e2e "Use coda_advance to move to phase 'build'"
sleep 10
cmux read-screen e2e
```

**Verify:**
- [ ] Gate FAILS with reason about human review pending
- [ ] Phase remains "review"

### Step 2.2: Approve the plan as human

```bash
cmux send e2e "I approve the plan. Use coda_update on 'issues/add-calculator/plan-v1' to set human_review_status 'approved'"
sleep 10
cmux send e2e "Use coda_advance to move to phase 'build'"
sleep 10
cmux read-screen e2e
```

**Verify:**
- [ ] human_review_status set to "approved"
- [ ] Gate passes
- [ ] Phase advances to BUILD

---

## Scenario 3: Verify Finds Unmet ACs and Creates Corrections

**Goal:** Build tasks but intentionally leave AC-3 (error handling) unimplemented. Verify catches it and generates a correction task.

### Step 3.1: Complete build tasks (simulated — skip full TDD for speed)

```bash
# Write actual code so tests can pass for AC-1 and AC-2
cmux send e2e "Write file src/calc.ts with: export function add(a: number, b: number): number { return a + b; } export function subtract(a: number, b: number): number { return a - b; }"
sleep 10

# Write tests for AC-1 and AC-2 (AC-3 intentionally missing)
cmux send e2e "Write file tests/calc.test.ts with: import { describe, test, expect } from 'bun:test'; import { add, subtract } from '../src/calc'; describe('calculator', () => { test('add', () => { expect(add(2,3)).toBe(5); }); test('subtract', () => { expect(subtract(5,3)).toBe(2); }); });"
sleep 10

# Mark tasks complete
cmux send e2e "Use coda_update on 'issues/add-calculator/tasks/01-implement-addition' to set status 'complete'"
sleep 5
cmux send e2e "Use coda_update on 'issues/add-calculator/tasks/02-implement-subtraction' to set status 'complete'"
sleep 5

# Also mark any AC-3 task complete (from review fix)
cmux send e2e "Use coda_read on 'issues/add-calculator/tasks/' to list all tasks"
sleep 10
# Mark the AC-3 task complete too (it was created by revise but we didn't implement error handling)
cmux send e2e "Find and mark complete any task covering AC-3 using coda_update with status 'complete'"
sleep 10

cmux send e2e "Use coda_advance to move to phase 'verify'"
# Expected trigger behavior: successful `coda_advance` into `verify` runs the deterministic verify runner immediately.
# If unmet ACs remain, CODA writes verification-failure artifacts, creates correction tasks,
# switches state to `verify/correct`, and queues the correction turn automatically as a Pi follow-up message.
sleep 10
```

**Verify:**
- [ ] All tasks marked complete
- [ ] Phase advances to verify
- [ ] Submode should be "verify"

### Step 3.2: Verify should detect AC-3 is not met

```bash
# Wait for verify session
# The supported operator trigger is the `coda_advance` call above plus the extension-managed follow-up turn.
sleep 30
cmux read-screen e2e
```

**Verify:**
- [ ] AC-1 and AC-2 marked "met" (code exists, tests pass)
- [ ] AC-3 marked "not-met" (no error handling exists, no test for it)
- [ ] Verification failure artifact written for AC-3
- [ ] Submode transitions to "correct"

```bash
cmux send e2e "Run: ls .coda/issues/add-calculator/verification-failures/"
sleep 5
cmux read-screen e2e
```

**Verify:**
- [ ] `AC-3.yaml` (or similar) exists

### Step 3.3: Correct should generate and run a correction task

```bash
# Wait for correction task generation + BUILD loop execution
# The correction turn should already be queued automatically by the verify trigger path.
sleep 45
cmux read-screen e2e
```

**Verify:**
- [ ] Correction task created (kind: correction, fix_for_ac: AC-3)
- [ ] BUILD loop runs on correction task (with TDD enforcement)
- [ ] After correction completes, submode transitions back to "verify"
- [ ] loop_iteration incremented

### Step 3.4: Re-verify should pass

```bash
# Wait for re-verify
# Re-verify should be reached through the same extension-managed follow-up chain after correction completes.
sleep 30
cmux read-screen e2e
```

**Verify:**
- [ ] All ACs now met (including AC-3)
- [ ] Full test suite passes
- [ ] Phase advances to unify (or ready to advance)

---

## Scenario 4: Loop Exhaustion

**Goal:** Force the verify loop to exhaust by making AC-3 unfixable within 2 iterations.

**Note:** This scenario is difficult to force in a live test because the agent may actually fix it. Two approaches:

### Option A: Set max_verify_iterations to 1

```bash
# Before starting this scenario, update config:
cmux send e2e "Run: cat .coda/coda.json | jq '.max_verify_iterations = 1' > /tmp/coda.json && mv /tmp/coda.json .coda/coda.json"
sleep 5
```

Then create a new issue with an AC that's deliberately impossible to satisfy in one iteration. Or:

### Option B: Test exhaustion via coda_status after manually incrementing

```bash
# Create a simulated exhaustion state by manually setting loop_iteration
# This tests the exhaustion DISPLAY, not the full loop
cmux send e2e "Use coda_status to check current loop_iteration"
sleep 5
cmux read-screen e2e
```

**Verify:**
- [ ] When exhaustion triggers, automation pauses
- [ ] Message shows remaining issues and human options
- [ ] Agent does NOT auto-continue past exhaustion
- [ ] Human can provide guidance, manually approve, or kill

### Step 4.1: If exhaustion reached, test `/coda kill`

```bash
# Only if we have a killable issue
cmux send e2e "/coda kill"
sleep 10
cmux read-screen e2e
```

**Verify:**
- [ ] Issue status set to "wont-fix"
- [ ] Phase set to "done"
- [ ] State cleared

---

## Scenario 5: /coda back (preservation test)

**Goal:** Rewind from verify to specify and confirm artifacts are preserved, not deleted.

### Step 5.1: Create a fresh issue and advance to verify

```bash
cmux send e2e "Use coda_create: type 'issue', title 'Back Test', issue_type 'feature', status 'active', phase 'specify', acceptance_criteria [{id: 'AC-1', text: 'Test back', status: 'pending'}], open_questions [], human_review false"
sleep 10
cat > .coda/state.json << 'EOF'
{
  "version": 1,
  "focus_issue": "back-test",
  "phase": "specify",
  "submode": null,
  "loop_iteration": 0,
  "current_task": null,
  "completed_tasks": [],
  "tdd_gate": "locked",
  "last_test_exit_code": null,
  "task_tool_calls": 0,
  "enabled": true
}
EOF
# Rush through phases...
cmux send e2e "Use coda_advance to move to phase 'plan'"
sleep 5
cmux send e2e "Use coda_create: type 'plan', title 'Back Test Plan', issue 'back-test', status 'approved', iteration 1, task_count 1, human_review_status 'not-required'"
sleep 5
cmux send e2e "Use coda_create: type 'task', id 1, issue 'back-test', title 'Task One', status 'complete', kind 'planned', covers_ac ['AC-1']"
sleep 5
cmux send e2e "Use coda_advance to move to phase 'review'"
sleep 5
cmux send e2e "Use coda_advance to move to phase 'build'"
sleep 5
cmux send e2e "Use coda_advance to move to phase 'verify'"
sleep 10
```

### Step 5.2: Run /coda back to specify

```bash
cmux send e2e "/coda back specify"
sleep 10
cmux read-screen e2e
```

**Verify:**
- [ ] Phase resets to "specify"
- [ ] Plan marked "superseded" (NOT deleted)
- [ ] Task files still exist on disk (NOT deleted)
- [ ] ACs cleared for re-specification

```bash
cmux send e2e "Run: ls .coda/issues/back-test/"
sleep 5
cmux send e2e "Use coda_read on 'issues/back-test/plan-v1' and tell me its status"
sleep 10
cmux read-screen e2e
```

**Verify:**
- [ ] plan-v1.md exists with status "superseded"
- [ ] tasks/ directory exists with files intact
- [ ] Institutional knowledge preserved

---

## Summary Checklist

| # | Test | Result | Notes |
|---|------|--------|-------|
| 1.1 | Create issue with 3 ACs | | |
| 1.2 | Create flawed plan (AC-3 uncovered) | | |
| 1.3 | Review detects missing AC-3 coverage | | |
| 1.4 | Revise fixes plan | | |
| 1.5 | Re-review approves | | |
| 2.1 | Human review gate BLOCKS advance | | |
| 2.2 | Human approves → advances to BUILD | | |
| 3.1 | Build tasks (AC-3 unimplemented) | | |
| 3.2 | Verify detects AC-3 not met | | |
| 3.3 | Correction task generated + runs | | |
| 3.4 | Re-verify passes | | |
| 4.1 | Exhaustion pauses automation | | |
| 4.2 | /coda kill terminates issue | | |
| 5.1 | Setup issue at verify phase | | |
| 5.2 | /coda back preserves artifacts | | |

**Total tests: 15 scenarios covering all 4 required v0.2 capabilities + preservation semantics**

## Teardown

```bash
cmux send e2e "/exit"
sleep 3
cmux close e2e
rm -rf $TEST_DIR
```

---

*Script version: v0.2 — 2026-03-28*
*Tests: 15 scenarios (5 scenarios × multiple verification points)*
*Estimated time: 45-60 minutes (autonomous loops need time to run)*
