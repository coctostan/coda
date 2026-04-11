# E2E Test Script v0.5 — Compounding Loop Validation

## What This Tests

1. UNIFY runner produces completion record, merges spec delta, advances milestone
2. Post-UNIFY hooks fire (quality history, knowledge capture)
3. Module overlays accumulate across issues (Issue 1 validates pattern → Issue 2 sees it)
4. Gate automation respects config (auto vs human modes)
5. Prompt eval scores eval cases correctly
6. /coda pause + /coda resume round-trips state

## Target Project

Use `coda-test-todo` (from v0.7 E2E) — already has code + CODA structure.

## Setup

```bash
cp -r ~/pi/workspace/coda-test-todo ~/pi/workspace/coda-v05-compounding
cd ~/pi/workspace/coda-v05-compounding

cmux new-split --name e2e --size 60
cmux send e2e "cd ~/pi/workspace/coda-v05-compounding && pi -e /Users/maxwellnewman/pi/workspace/coda/packages/coda/src/pi/index.ts"
sleep 15
```

---

## Scenario 1: Full Issue Lifecycle → UNIFY Compounding

Create a feature issue and run it through the full lifecycle:

```bash
cmux send e2e 'Use coda_create to create an issue: type "issue", title "Add priority field", issue_type "feature", ...'
sleep 10
```

Run through SPECIFY → PLAN → BUILD → VERIFY → UNIFY.

**Verify at UNIFY:**
- [ ] Completion record written to `.coda/issues/{slug}/completion.md`
- [ ] ref-system.md updated with new capability (priority field)
- [ ] Post-unify hooks fired (quality history entry, knowledge capture)
- [ ] Milestone progress advanced

---

## Scenario 2: Module Overlay Accumulates

After Issue 1 completes, check:

```bash
cmux send e2e "Run: cat .coda/modules/security.local.md 2>/dev/null"
```

**Verify:**
- [ ] Overlay exists for at least one module
- [ ] Contains validated patterns from Issue 1

Create Issue 2 (bugfix). During PLAN phase:

**Verify:**
- [ ] Module prompt includes overlay content from Issue 1
- [ ] Agent behavior reflects project-specific context

---

## Scenario 3: Gate Automation

Configure auto gates for chore type:

```bash
cmux send e2e 'Use coda_config to set gates.plan_review to "auto"'
cmux send e2e 'Create a chore issue: "Clean up unused imports"'
```

**Verify:**
- [ ] Chore issue auto-advances through specify and plan (no human pause)
- [ ] Feature issue still pauses for human review at plan

---

## Scenario 4: Prompt Eval

```bash
cmux send e2e "Run: bun test packages/coda/src/eval/"
```

**Verify:**
- [ ] Eval cases load for each module
- [ ] Scorer correctly identifies pass/fail cases
- [ ] Suite result aggregates correctly

---

## Scenario 5: Pause + Resume

During Issue 2 BUILD phase:

```bash
cmux send e2e "/coda pause"
sleep 5
cmux read-screen e2e
```

**Verify:**
- [ ] `.coda/handoff.md` written with current task/phase
- [ ] Handoff includes in-progress work description

Simulate resume:

```bash
cmux send e2e "/coda resume"
sleep 10
cmux read-screen e2e
```

**Verify:**
- [ ] Agent picks up from where it paused
- [ ] Handoff.md cleaned up after resume
- [ ] Task progress preserved

---

## Summary Checklist

| # | Test | Result | Notes |
|---|------|--------|-------|
| 1 | Completion record written at UNIFY | | |
| 2 | ref-system.md updated with spec delta | | |
| 3 | Post-UNIFY hooks fired | | |
| 4 | Module overlay accumulates | | |
| 5 | Overlay content visible in next issue | | |
| 6 | Gate automation for chore auto-advances | | |
| 7 | Feature still pauses at human gate | | |
| 8 | Prompt eval suite passes | | |
| 9 | Pause writes handoff | | |
| 10 | Resume restores context | | |

## Teardown

```bash
cmux send e2e "/exit"
sleep 3
cmux close e2e
```

---

*Script version: v0.5*
*Estimated time: 45-60 minutes*
