# E2E Test Script v0.4 — Brownfield FORGE on Real Project

## What This Tests

1. Brownfield detection works (existing code, no .coda/)
2. Module init-scan hooks fire and produce evidence files
3. SYNTHESIZE produces reasonable ref docs from evidence
4. GAP ANALYSIS identifies real issues with dependency ordering
5. Topic-based section retrieval works in subsequent phases
6. Adaptive ceremony applies correct rules for issue type
7. Context budgets keep context within targets

## Target Project

Clone a small, well-known open-source project. Suggestions:
- **express/examples/hello-world** — minimal Express app
- **todo-mvc** — classic todo app (if a simple standalone version exists)
- Or use the `coda-test-todo` project from v0.2.2 E2E (already has code + tests)

For this script, we'll use `coda-test-todo` since it's already built and known.

## Setup

```bash
# Copy the existing test project (preserving code, removing .coda/)
cp -r ~/pi/workspace/coda-test-todo ~/pi/workspace/coda-v04-brownfield
cd ~/pi/workspace/coda-v04-brownfield
rm -rf .coda  # remove existing CODA state — simulate "existing project, first CODA use"
git add -A && git commit -m "strip .coda for brownfield test" 2>/dev/null || true

cmux new-split --name e2e --size 60
cmux send e2e "cd ~/pi/workspace/coda-v04-brownfield && pi -e /Users/maxwellnewman/pi/workspace/coda/packages/coda/src/pi/index.ts"
sleep 15
```

---

## Scenario 1: Brownfield Detection + FORGE

```bash
cmux send e2e "/coda forge"
sleep 15
cmux read-screen e2e
```

**Verify:**
- [ ] CODA detects brownfield (package.json + src/ exist, no .coda/)
- [ ] Brownfield flow begins (not greenfield)
- [ ] Scaffold created (.coda/ directory)

---

## Scenario 2: Module SCAN

```bash
# Wait for evidence gathering
sleep 60
cmux read-screen e2e
```

**Verify:**
- [ ] Evidence files created in `.coda/forge/initial/onboarding/`
- [ ] At least EVIDENCE-universal.md exists (README, package.json scanned)
- [ ] At least 3 module evidence files exist (architecture, quality, security)

```bash
cmux send e2e "Run: ls .coda/forge/initial/onboarding/"
sleep 5
cmux read-screen e2e
```

---

## Scenario 3: SYNTHESIZE — Ref Docs from Evidence

```bash
# Wait for synthesis
sleep 30
cmux read-screen e2e
```

**Verify:**
- [ ] ref-system.md exists and describes the todo CLI capabilities
- [ ] ref-architecture.md exists and identifies the project structure
- [ ] ref-conventions.md exists and describes testing patterns

```bash
cmux send e2e "Run: cat .coda/reference/ref-system*.md | head -40"
sleep 5
cmux read-screen e2e
```

- [ ] Capabilities section lists add, list, done, remove commands
- [ ] JSON storage mentioned

---

## Scenario 4: GAP ANALYSIS

```bash
cmux send e2e "Run: cat .coda/forge/initial/GAP-ANALYSIS.md 2>/dev/null | head -40"
sleep 5
cmux read-screen e2e
```

**Verify:**
- [ ] GAP-ANALYSIS.md exists
- [ ] Has summary dashboard with domain verdicts
- [ ] Has priority issues (may identify: no CI, limited test coverage, etc.)
- [ ] Recommendations are dependency-ordered

---

## Scenario 5: VALIDATE + ORIENT

The agent should ask for human review. Provide approvals:

```bash
cmux send e2e "The ref docs look accurate. The gap analysis priorities are reasonable. For future direction: let's add a priority field to todos and improve the list command formatting. Create a milestone for that."
sleep 30
cmux read-screen e2e
```

**Verify:**
- [ ] Agent accepts corrections
- [ ] Milestone created
- [ ] Forge complete

---

## Scenario 6: Run an Issue with Context Features

Create a bugfix issue (lighter ceremony) and verify context features work:

```bash
cmux send e2e 'Use coda_create: type "issue", title "Fix list formatting", issue_type "bugfix", status "active", phase "specify", topics ["cli", "display"], acceptance_criteria [{id: "AC-1", text: "todo list shows aligned columns", status: "pending"}], open_questions []'
sleep 15
```

**Verify topic-based retrieval:**
- [ ] PLAN phase loads only "cli" and "display" sections from ref docs (not full doc)

**Verify adaptive ceremony:**
- [ ] Bugfix gets TDD enforcement (bugfix.tddEnabled = true)
- [ ] Human review defaults per config

**Verify context budgets:**
- [ ] Context injection doesn't include the full gap analysis or all evidence files
- [ ] Only relevant summaries included

---

## Summary Checklist

| # | Test | Result | Notes |
|---|------|--------|-------|
| 1 | Brownfield detected | | |
| 2 | Evidence files created | | |
| 3 | ref-system.md accurate | | |
| 4 | GAP-ANALYSIS.md exists with ordering | | |
| 5 | VALIDATE + ORIENT flow | | |
| 6 | Topic retrieval in subsequent issue | | |
| 7 | Adaptive ceremony for bugfix type | | |
| 8 | Context budgets respected | | |

## Teardown

```bash
cmux send e2e "/exit"
sleep 3
cmux close e2e
# Keep ~/pi/workspace/coda-v04-brownfield for inspection
```

---

*Script version: v0.4*
*Estimated time: 30-45 minutes*
