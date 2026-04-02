# E2E Real Project Test — Findings

**Date:** 2026-03-29
**Test dir:** ~/pi/workspace/coda-test-todo
**Model:** openai/gpt-5.4 (switched from gpt-5.4-mini due to quota), thinking medium
**CMUX surface:** surface:57
**Extension:** packages/coda/src/pi/index.ts
**Duration:** ~25 minutes (excluding quota-related pause)

## Results Summary

| Phase | Result |
|-------|--------|
| SETUP | PASS |
| FORGE | PASS (with findings) |
| SPECIFY | PASS |
| PLAN | PASS |
| BUILD | PASS |
| VERIFY | PASS |
| UNIFY | PASS |
| FUNCTIONAL | PASS |

**Overall: 8/8 phases PASS. Full lifecycle completed successfully.**

## Checkpoints

### SETUP-1: Pi loaded
**Result:** PASS
**Evidence:** Pi running with GPT-5.4, coda-test-todo, main branch.
**Finding:** PI_MIRROR_DISABLED=1 needed due to 26 Pi instances exhausting ports 3001-3011.

### FORGE-1: Scaffold created
**Result:** PASS
**Evidence:** `/coda forge` produced "✓ Project scaffolded" message. `.coda/` directory created with coda.json.
**Finding F1:** `cmux send` does NOT auto-send Return — must follow every send with `cmux send-key Return`. The test script needs updating.
**Finding F2:** `tdd_test_command` and `full_suite_command` are null after scaffold. The agent tried to update them but was blocked by the .coda write gate. coda.json is a config file, not an mdbase record — there's no coda_* tool to update it. Had to fix externally.

### FORGE-2: Reference docs created
**Result:** PASS
**Evidence:** ref-system-spec.md and ref-product-requirements.md created via coda_create.
**Finding F3:** Agent chose different filenames than specified (ref-system-spec.md instead of ref-system.md). Minor — the tool slugifies the title.

### SPECIFY-1: Issue created
**Result:** PASS
**Evidence:** implement-core-todo-commands.md created with 5 ACs, all pending.

### SPECIFY → PLAN advance
**Result:** PASS (with manual intervention)
**Finding F4:** `state.json` not created by scaffold. `coda_advance` failed with "Coda workflow state is not initialized." Had to create state.json manually. **This is a blocker for fresh projects.**

### PLAN-1: Plan + tasks created
**Result:** PASS
**Evidence:** plan-v1.md + 3 task files created. Plan approved, advanced through review → build.
**Finding F5:** `module-findings.json` was automatically created during plan phase — the module system fired and the agent used coda_report_findings with real security analysis findings. This is working as designed.

### BUILD-1: All tasks complete
**Result:** PASS
**Evidence:** All 3 tasks status "complete". src/ has types.ts, storage.ts, cli.ts. tests/ has 3 files, 7 tests passing.
**Finding F6:** Agent didn't automatically continue to task 2 after finishing task 1 — needed nudging messages. The build loop doesn't auto-advance between tasks; the orchestrator has to prompt.
**Finding F7:** TDD workflow was followed — agent wrote tests first, ran them (fail), wrote code, ran them (pass). The TDD gate worked correctly.

### BUILD → VERIFY advance
**Result:** PASS (with findings gate working)
**Finding F8:** Build→verify gate correctly blocked advancement until post-build findings were submitted via coda_report_findings. The agent needed explicit guidance on what JSON to submit. The gate is working but the UX is rough — the agent doesn't automatically know to call coda_report_findings after build.

### VERIFY-1: All ACs met
**Result:** PASS
**Evidence:** All 5 ACs updated to status "met". Phase advanced to unify.

### UNIFY-1: Completion
**Result:** PASS
**Evidence:** ref-system-spec.md updated with built capabilities. Phase is "done".

### FUNC-1: CLI works
**Result:** PASS
**Evidence:** add ("Added todo #1"), list ("[x] 1: Buy groceries"), done ("Completed todo #1"), remove ("Removed todo #2"), persistence (todos.json exists with correct data).

## Issues Found

### F1: cmux send requires explicit Return (SCRIPT)
- **Severity:** Low
- **Impact:** Test script needs `cmux send-key Return` after every `cmux send`
- **Fix:** Update test script

### F2: coda.json not updatable via coda_* tools (CODA)
- **Severity:** High
- **Impact:** Agent cannot configure test commands after scaffold. Write gate blocks bash writes to .coda/. No coda_update_config tool exists.
- **Fix:** Either add a `coda_config` tool, or exclude coda.json from write gate, or have scaffold prompt for test commands.

### F3: Agent-chosen filenames differ from requested (CODA)
- **Severity:** Low
- **Impact:** Reference docs get slugified titles. Minor but may confuse scripts expecting exact filenames.
- **Fix:** Accept tool's record parameter more literally, or document the slugification.

### F4: state.json not created by scaffold — BLOCKER (CODA)
- **Severity:** Critical
- **Impact:** `coda_advance` fails completely on fresh projects. No way to start the lifecycle without manual state creation.
- **Fix:** `scaffoldCoda()` must create a default `state.json` with version:1, enabled:true, phase:null, etc.

### F5: Module system fires at runtime ✓ (POSITIVE)
- **Severity:** N/A — positive finding
- **Impact:** The security module fired during plan phase and produced real analysis findings that were persisted to module-findings.json. The v0.3 module system works end-to-end at runtime.

### F6: Build loop doesn't auto-advance between tasks (CODA)
- **Severity:** Medium
- **Impact:** Orchestrator must explicitly tell agent to start each task. The agent finishes task N but doesn't automatically read and start task N+1.
- **Fix:** Build phase context should include "after completing a task, read the next pending task and continue."

### F7: TDD gate works ✓ (POSITIVE)
- **Severity:** N/A — positive finding
- **Impact:** Agent followed TDD: tests first → fail → code → pass. Write gate enforced test-first discipline.

### F8: coda_report_findings UX is rough (CODA)
- **Severity:** Medium
- **Impact:** The build→verify gate works correctly (blocks without findings, passes after), but the agent doesn't automatically know to call coda_report_findings. The module prompt instructs it, but the connection between "module prompt asked for JSON" and "call this tool" isn't intuitive.
- **Fix:** Make the before_agent_start context for build phase explicitly instruct: "After completing analysis, submit findings using coda_report_findings tool."

### F9: OpenAI quota exhaustion (ENVIRONMENT)
- **Severity:** N/A — environment issue
- **Impact:** gpt-5.4-mini hit billing quota. Had to switch models mid-test.
- **Fix:** Use a model with available quota or prepay.

## Agent Experience Observations

1. **Tool discovery was good** — the agent found and used coda_create, coda_read, coda_update, coda_run_tests, coda_advance, and coda_report_findings without being told the tool names explicitly.
2. **TDD workflow felt natural** — the agent wrote tests first, watched them fail, then wrote code. The gate enforcement worked.
3. **Module system integration worked** — security analysis ran during plan phase and produced real findings. Post-build findings gate enforced submission.
4. **Context injection helped** — before_agent_start provided relevant phase context. The agent knew what phase it was in and what was expected.
5. **Pain points:** (a) No state.json after scaffold — dead stop. (b) Can't update coda.json — no tool for config. (c) Build loop needs per-task nudging. (d) coda_report_findings call not obvious to the agent.
6. **Context usage:** 25.1% of 272k at completion — plenty of room. ~4.1M tokens total.

## Artifacts

### .coda/ files
- coda.json (config with modules)
- state.json (lifecycle state — manually created)
- issues/implement-core-todo-commands.md (issue with 5 ACs, all met)
- issues/implement-core-todo-commands/plan-v1.md
- issues/implement-core-todo-commands/module-findings.json
- issues/implement-core-todo-commands/tasks/01-todo-type-and-json-storage.md
- issues/implement-core-todo-commands/tasks/02-cli-add-and-list-commands.md
- issues/implement-core-todo-commands/tasks/03-done-and-remove-commands.md
- reference/ref-system-spec.md
- reference/ref-product-requirements.md

### Source files
- src/types.ts
- src/storage.ts
- src/cli.ts
- tests/storage.test.ts
- tests/cli-add-list.test.ts
- tests/cli-done-remove.test.ts

### Test results
- 7 tests, 7 passing, 0 failing
