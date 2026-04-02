# E2E Test Script v0.3 — Module System

## What This Tests

1. Security module detects a hardcoded secret and blocks advancement
2. Architecture module detects a layer violation and warns
3. TDD module fires at build boundaries (upgraded from hardcoded)
4. Quality module captures baseline and detects regression
5. Knowledge module produces findings at post-unify (advisory, no block)
6. Module disabled in config → doesn't fire
7. Human override bypasses a module block

## Prerequisites

- v0.2 E2E passing
- v0.3 code built, all tests passing
- 12 module prompt files in `modules/prompts/`
- CMUX available

## Setup

```bash
export TEST_DIR=$(mktemp -d -t coda-v03-e2e-XXXX)
cd $TEST_DIR

echo '{ "name": "coda-v03-test", "type": "module", "scripts": { "test": "bun test", "lint": "echo lint-ok" } }' > package.json
mkdir -p src tests
git init && git add -A && git commit -m "init"

# Scaffold .coda/ with modules config
mkdir -p .coda/reference .coda/issues .coda/milestones
cat > .coda/coda.json << 'EOF'
{
  "tdd_test_command": "bun test",
  "full_suite_command": "bun test",
  "verification_commands": [],
  "tdd_gate": { "feature": true },
  "human_review_default": { "feature": false },
  "max_review_iterations": 2,
  "max_verify_iterations": 2,
  "modules": {
    "security": { "enabled": true, "blockThreshold": "critical" },
    "architecture": { "enabled": true, "blockThreshold": "high" },
    "tdd": { "enabled": true, "blockThreshold": "high" },
    "quality": { "enabled": true, "blockThreshold": "high" },
    "knowledge": { "enabled": true }
  }
}
EOF

cat > .coda/reference/ref-system.md << 'EOF'
---
title: System Spec
category: system
topics: [auth-service]
---
## Capabilities
None yet.
EOF

cmux new-split --name e2e --size 60
cmux send e2e "cd $TEST_DIR && pi -e /Users/maxwellnewman/pi/workspace/coda/packages/coda/src/pi/index.ts"
sleep 10
```

---

## Scenario 1: Security Module Blocks on Hardcoded Secret

**Goal:** Create an issue where BUILD produces code with a hardcoded API key. The security module's post-build hook should detect it and BLOCK advancement to VERIFY.

### Step 1.1: Create and advance issue to BUILD

```bash
cmux send e2e "Use coda_create: type 'issue', title 'Add API Client', issue_type 'feature', status 'active', phase 'specify', acceptance_criteria [{id: 'AC-1', text: 'Can call external API', status: 'pending'}], open_questions [], human_review false"
sleep 10
cmux send e2e "Use coda_advance to move to phase 'plan'"
sleep 5

# Create plan + task
cmux send e2e "Use coda_create: type 'plan', title 'API Client Plan', issue 'add-api-client', status 'approved', iteration 1, task_count 1, human_review_status 'not-required'"
sleep 5
cmux send e2e "Use coda_create: type 'task', id 1, issue 'add-api-client', title 'Implement API client', status 'pending', kind 'planned', covers_ac ['AC-1'], files_to_modify ['src/api-client.ts']"
sleep 5

# Advance through review to build
cmux send e2e "Use coda_advance to move to phase 'review'"
sleep 5
cmux send e2e "Use coda_advance to move to phase 'build'"
sleep 5
```

### Step 1.2: Write code WITH a hardcoded secret

```bash
# Write test first (TDD gate)
cmux send e2e "Write file tests/api-client.test.ts with: import { describe, test, expect } from 'bun:test'; import { callApi } from '../src/api-client'; describe('api client', () => { test('exists', () => { expect(callApi).toBeDefined(); }); });"
sleep 10

# Run failing test to unlock TDD gate
cmux send e2e "Use coda_run_tests with mode 'tdd'"
sleep 10

# Write production code WITH hardcoded secret
cmux send e2e "Write file src/api-client.ts with: const API_KEY = 'sk-live-abc123secret456'; export async function callApi() { return fetch('https://api.example.com', { headers: { 'Authorization': 'Bearer ' + API_KEY } }); }"
sleep 10

# Run passing test
cmux send e2e "Use coda_run_tests with mode 'tdd'"
sleep 10

# Mark task complete
cmux send e2e "Use coda_update on 'issues/add-api-client/tasks/01-implement-api-client' to set status 'complete'"
sleep 5
```

### Step 1.3: Post-build modules fire — security should BLOCK

```bash
# Try to advance to verify
cmux send e2e "Use coda_advance to move to phase 'verify'"
sleep 30
cmux read-screen e2e
```

**Verify:**
- [ ] Security module fires at post-build
- [ ] Finding: hardcoded secret detected (`sk-live-abc123secret456`)
- [ ] Severity: critical
- [ ] BLOCKED — cannot advance to verify
- [ ] Block reason mentions the hardcoded secret
- [ ] Assumption field present (e.g., "assumes this is a real API key, not a test placeholder")

### Step 1.4: Check findings persisted

```bash
cmux send e2e "Run: cat .coda/issues/add-api-client/module-findings.json"
sleep 5
cmux read-screen e2e
```

**Verify:**
- [ ] module-findings.json exists
- [ ] Contains post-build hook result
- [ ] Security finding with severity critical
- [ ] blocked: true

### Step 1.5: Fix the issue

```bash
cmux send e2e "Write file src/api-client.ts with: export async function callApi() { const apiKey = process.env.API_KEY; if (!apiKey) throw new Error('API_KEY not set'); return fetch('https://api.example.com', { headers: { 'Authorization': 'Bearer ' + apiKey } }); }"
sleep 10

# Now try to advance again
cmux send e2e "Use coda_advance to move to phase 'verify'"
sleep 30
cmux read-screen e2e
```

**Verify:**
- [ ] Post-build re-runs (or manual re-check)
- [ ] Security module: no critical findings
- [ ] Advancement to verify succeeds

---

## Scenario 2: Human Override Bypasses Module Block

If scenario 1's block can't be resolved in the session, test the override:

```bash
cmux send e2e "/coda advance"
sleep 10
cmux read-screen e2e
```

**Verify:**
- [ ] Human-invoked `/coda advance` bypasses module block
- [ ] Phase advances despite unresolved findings
- [ ] Findings still recorded (not discarded)

---

## Scenario 3: Architecture Module Warns on Layer Violation

### Step 3.1: Create code with an import direction violation

For this test, the project needs an established architecture. Create a simple 2-layer structure:

```bash
cmux send e2e "Run: mkdir -p src/data src/ui"
sleep 3
cmux send e2e "Write file src/data/store.ts with: export function getData() { return []; }"
sleep 5
# UI importing from data = OK
cmux send e2e "Write file src/ui/display.ts with: import { getData } from '../data/store'; export function show() { console.log(getData()); }"
sleep 5
# Data importing from UI = VIOLATION
cmux send e2e "Write file src/data/reporter.ts with: import { show } from '../ui/display'; export function report() { show(); }"
sleep 5
```

### Step 3.2: Architecture module should find the violation

After these files exist, if we're in a BUILD phase with architecture module firing:

```bash
# The post-build architecture module should flag src/data/reporter.ts
# importing from src/ui/display.ts as a layer violation
cmux read-screen e2e
```

**Verify:**
- [ ] Architecture module produces finding: layer violation
- [ ] Severity: high (data layer importing from UI layer)
- [ ] Assumption: "assumes src/data/ is a lower layer than src/ui/"

---

## Scenario 4: Module Disabled → Doesn't Fire

### Step 4.1: Disable security module and verify it doesn't fire

```bash
# Update config to disable security
cmux send e2e "Run: cat .coda/coda.json | sed 's/\"security\": { \"enabled\": true/\"security\": { \"enabled\": false/' > /tmp/coda.json && mv /tmp/coda.json .coda/coda.json"
sleep 3

# Create a new issue with hardcoded secret — security should NOT fire
# (abbreviated — just check that post-build doesn't include security findings)
cmux read-screen e2e
```

**Verify:**
- [ ] With security disabled, hardcoded secrets are NOT flagged
- [ ] Other modules (architecture, tdd, quality) still fire
- [ ] module-findings.json has no security entries for this issue

---

## Scenario 5: Knowledge Module at Post-Unify

### Step 5.1: Complete an issue through to UNIFY

```bash
# Advance a completed issue to unify
# (Use an issue that's already passed verify)
# During UNIFY, knowledge module should fire
sleep 30
cmux read-screen e2e
```

**Verify:**
- [ ] Knowledge module fires at post-unify
- [ ] Produces INFO-level findings about decisions, patterns, lessons
- [ ] Never blocks (knowledge module has no block threshold)
- [ ] Findings persisted in module-findings.json

---

## Summary Checklist

| # | Test | Result | Notes |
|---|------|--------|-------|
| 1.1 | Setup issue to BUILD | | |
| 1.2 | Write code with hardcoded secret | | |
| 1.3 | Security module BLOCKS at post-build | | |
| 1.4 | Findings persisted to JSON | | |
| 1.5 | Fix secret → advance succeeds | | |
| 2.1 | Human override bypasses block | | |
| 3.1 | Create layer violation code | | |
| 3.2 | Architecture module finds violation | | |
| 4.1 | Disabled module doesn't fire | | |
| 5.1 | Knowledge module fires at post-unify | | |

**Total: 10 scenarios**

## Teardown

```bash
cmux send e2e "/exit"
sleep 3
cmux close e2e
rm -rf $TEST_DIR
```

---

*Script version: v0.3 — 2026-04-01*
*Tests: 10 scenarios covering module system E2E*
*Estimated time: 30-45 minutes*
