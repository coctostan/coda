# E2E Test Script v1 — CODA Live Extension Test

## Prerequisites

- Pi CLI installed globally (`pi` command available)
- CMUX installed and working (`cmux` command available)
- Model API key configured for `openai-codex/gpt-5.4-mini`
- CODA repo cloned at working directory with all tests passing
- `bun install` completed in workspace root

## Setup

```bash
# 1. Create a temporary test project directory
export TEST_DIR=$(mktemp -d -t coda-e2e-XXXX)
cd $TEST_DIR
mkdir -p .coda
echo '{}' > package.json
git init && git add -A && git commit -m "init"

# 2. Open a CMUX pane for the Pi session
cmux new-split --name coda-e2e --size 60

# 3. Start Pi with the CODA extension
cmux send coda-e2e "pi -e /Users/maxwellnewman/pi/workspace/coda/packages/coda/src/pi/index.ts --model openai-codex/gpt-5.4-mini"

# 4. Wait for Pi to fully load (10 seconds)
sleep 10
```

## Test Steps

### Step 1: Verify Extension Loaded

**Action:**
```bash
cmux read-screen coda-e2e
```

**Expected:**
- Pi session is active (prompt visible)
- No module format errors
- No "failed to load extension" errors

**Record:** Screenshot output, note any errors.

---

### Step 2: Verify `/coda` Command Available

**Action:**
```bash
cmux send coda-e2e "/coda"
sleep 5
cmux read-screen coda-e2e
```

**Expected:**
- Output shows CODA status (phase, task, next action)
- No "unknown command" error

**Record:** Full command output.

---

### Step 3: Test `/coda forge` Subcommand

**Action:**
```bash
cmux send coda-e2e "/coda forge"
sleep 5
cmux read-screen coda-e2e
```

**Expected:**
- Notification about FORGE readiness (placeholder for v0.1)
- No crash or unhandled error

**Record:** Full command output.

---

### Step 4: Test `coda_status` Tool via Agent

**Action:**
```bash
cmux send coda-e2e "Use the coda_status tool to check the current project status"
sleep 15
cmux read-screen coda-e2e
```

**Expected:**
- Agent calls `coda_status` tool
- Returns status information (may show "not initialized" for empty project)
- No tool execution errors

**Record:** Full agent response and tool output.

---

### Step 5: Test `coda_create` Tool via Agent

**Action:**
```bash
cmux send coda-e2e "Use the coda_create tool to create a new issue with type 'issue', title 'Test Issue', issue_type 'feature', status 'proposed', phase 'specify', priority 3"
sleep 15
cmux read-screen coda-e2e
```

**Expected:**
- Agent calls `coda_create` tool
- Record is created in `.coda/` directory
- Tool returns success with slug/path

**Record:** Full agent response, verify file created.

---

### Step 6: Test `.coda/` Write Protection (tool_call hook)

**Action:**
```bash
cmux send coda-e2e "Write the text 'hello' to the file .coda/test.md"
sleep 15
cmux read-screen coda-e2e
```

**Expected:**
- The `tool_call` hook intercepts the write attempt
- Write is blocked with reason: "Use coda_* tools to modify .coda/ files"
- No file is written to `.coda/test.md`

**Record:** Full agent response, check for block message.

---

### Step 7: Test `before_agent_start` Context Injection

**Action:**
```bash
# First, ensure there's a focused issue and phase in state
cmux send coda-e2e "Use coda_status to check state, then tell me what the current focus issue and phase are"
sleep 15
cmux read-screen coda-e2e
```

**Expected:**
- Agent receives phase context (if state has focus_issue/phase)
- Or reports no focused issue (if state is empty)

**Record:** Agent response — note whether context injection occurred.

---

### Step 8: Test `coda_read` Tool

**Action:**
```bash
cmux send coda-e2e "Use coda_read to read the issue we just created"
sleep 15
cmux read-screen coda-e2e
```

**Expected:**
- Agent calls `coda_read` tool with the slug from Step 5
- Returns the issue content (frontmatter + body)

**Record:** Full tool output.

---

## Observation Recording Format

For each step, record in E2E-RUN-LOG.md:

```markdown
### Step N: [Name]
**Time:** HH:MM
**Action:** [what was sent]
**Raw Output:**
[paste screen output]
**Result:** PASS / FAIL / PARTIAL
**Notes:** [any observations]
```

## Failure Handling

- If extension fails to load (Step 1): STOP. Record error. Check module format.
- If command not recognized (Step 2): Check registerCommand name format.
- If tool errors (Steps 4-8): Record full error, check parameter schemas.
- If hook doesn't fire (Step 6): Check event registration in hooks.ts.
- For any crash: `cmux read-screen coda-e2e` to capture full state before restarting.

## Teardown

```bash
# 1. Stop the Pi session
cmux send coda-e2e "exit"
sleep 3

# 2. Close the CMUX pane
cmux close coda-e2e

# 3. Clean up test directory
rm -rf $TEST_DIR
```

---

*Script version: v1 — 2026-03-28*
*Designed for: CODA v0.1 E2E validation*
