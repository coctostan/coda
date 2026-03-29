# E2E Run Log — CODA Live Extension Test

**Date:** 2026-03-28
**Model:** openai-codex/gpt-5.4-mini (think:high)
**Extension:** packages/coda/src/pi/index.ts
**Test Dir:** /var/folders/gw/.../coda-e2e-XXXX.hjVsng668t

---

### Step 1: Verify Extension Loaded
**Action:** `pi -e ./packages/coda/src/pi/index.ts --model openai-codex/gpt-5.4-mini`
**Raw Output:**
```
  path
    ~/pi/workspace/coda/packages/coda/src/pi/index.ts

[Extension issues]
  auto (user) ~/.pi/agent/extensions/pals-hooks.ts
    Extension shortcut conflict: 'ctrl+alt+h' ...
    Extension shortcut conflict: 'ctrl+alt+m' ...
```
**Result:** PASS
**Notes:** Extension loaded successfully. Only issues were unrelated shortcut conflicts from other extensions. Two prior failures occurred:
1. First attempt: `import.meta.dir` (Bun-specific) in `walt.ts` and `todd.ts` caused jiti to fail with "Cannot determine intended module format" error. Fixed by replacing with standard `import.meta.url` + `fileURLToPath`.
2. Second attempt: `@coda/core` workspace dependency not resolvable by jiti. Fixed by creating `node_modules/@coda/core` symlink.

---

### Step 2: Verify `/coda` Command Available
**Action:** `/coda`
**Raw Output:**
```
No CODA state is initialized in this repo.

If you want to start a CODA workflow, I need to initialize it first.
If that's the intent, say "initialize coda" and I'll proceed.
```
**Result:** PASS
**Notes:** Command appeared in autocomplete with description "Manage CODA lifecycle actions (status, forge, new, advance, build)". Agent correctly reported no state initialized.

---

### Step 3: Test `coda_status` Tool via Agent
**Action:** "Use the coda_status tool to check the current project status"
**Raw Output:**
```
coda_status
{
  "focus_issue": null,
  "phase": null,
  "current_task": null,
  "completed_tasks": [],
  "tdd_gate": "locked",
  "next_action": "No state found — run coda forge to initialize"
}

Current CODA status:
- Focus issue: none
- Phase: none
- Current task: none
- Completed tasks: none
- TDD gate: locked
- Next action: No state found — run coda forge to initialize
```
**Result:** PASS
**Notes:** Tool called correctly, returned full state JSON. Agent summarized results clearly.

---

### Step 4: Test `coda_create` Tool
**Action:** "Use coda_create to create an issue with type 'issue', fields: title 'Test Issue', issue_type 'feature', status 'proposed', phase 'specify', priority 3, and an empty body"
**Raw Output:**
```
coda_create
{
  "success": true,
  "path": "issues/test-issue.md",
  "id": "test-issue"
}

Created the issue:
- ID: test-issue
- Path: issues/test-issue.md
```
**Result:** PASS
**Notes:** Record created successfully in `.coda/issues/test-issue.md`.

---

### Step 5: Test `.coda/` Write Protection (tool_call hook)
**Action:** "Write the text 'hello' directly to the file .coda/test.md"
**Raw Output:**
```
write .coda/test.md

hello

Use coda_* tools to modify .coda/ files

I can't write directly to .coda/test.md with the generic file writer here;
.coda/ files must be modified through coda_* tools.
```
**Result:** PASS
**Notes:** Write was blocked by the `tool_call` hook. Block reason "Use coda_* tools to modify .coda/ files" displayed correctly. Agent understood the constraint and explained it to the user.

---

### Step 6: Test `coda_read` Tool
**Action:** "Use coda_read to read the issue test-issue"
**Raw Output:**
```
coda_read
{
  "success": true,
  "frontmatter": {
    "title": "Test Issue",
    "issue_type": "feature",
    "status": "proposed",
    "phase": "specify",
    "priority": 3
  },
  "body": ""
}

Read test-issue successfully via coda_read using the path issues/test-issue.md:
- title: Test Issue
- issue_type: feature
- status: proposed
- phase: specify
- priority: 3
- body: empty
```
**Result:** PASS
**Notes:** Full round-trip verified: create → read returns identical data.

---

## Summary

| Step | Test | Result |
|------|------|--------|
| 1 | Extension loads | PASS (after 2 fixes) |
| 2 | `/coda` command | PASS |
| 3 | `coda_status` tool | PASS |
| 4 | `coda_create` tool | PASS |
| 5 | `.coda/` write protection | PASS |
| 6 | `coda_read` tool | PASS |

**6/6 steps passed.** All core CODA extension functionality works in a live Pi session.

---

*Run completed: 2026-03-28*
