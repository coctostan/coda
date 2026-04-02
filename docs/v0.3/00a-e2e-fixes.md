# v0.3 Phase 0: E2E Fixes from v0.2.2

**Must be completed first.** These are blockers and UX issues found during the real project E2E test.

## F4 (Critical): scaffoldCoda() must create state.json

**Problem:** Fresh projects have no state.json. `coda_advance` fails with "Coda workflow state is not initialized."

**Fix:** In `scaffold.ts`, after creating `.coda/` directory structure, write a default state.json:

```typescript
const defaultState: CodaState = {
  version: 1,
  focus_issue: null,
  phase: null,
  current_task: null,
  completed_tasks: [],
  tdd_gate: 'locked',
  last_test_exit_code: null,
  task_tool_calls: 0,
  enabled: true,
  submode: null,
  loop_iteration: 0,
};
persistState(defaultState, join(codaRoot, 'state.json'));
```

**Test:** Run `/coda forge` on empty dir → `state.json` exists with valid default state.

---

## F2 (High): coda.json not updatable via tools

**Problem:** Agent can't set test commands after scaffold. Write gate blocks bash writes to `.coda/`. No tool for config.

**Fix:** Add a `coda_config` tool:

```typescript
coda_config({
  action: "get" | "set",
  key?: string,              // dot-path: "tdd_test_command", "modules.security.enabled"
  value?: any,               // for set action
}) → { config: object } | { updated: string }
```

- `get` returns current coda.json (or a specific key)
- `set` updates a specific key in coda.json
- Validates known keys, rejects unknown ones
- Does NOT go through the .coda/ write gate (it IS a coda_* tool)

**Alternative (simpler):** Exempt `coda.json` from the write gate. Let the agent write it directly. Downside: no validation.

**Recommendation:** Add `coda_config` tool — it's small, provides validation, and matches the tool-mediated-writes principle.

**Test:** `coda_config({ action: "set", key: "tdd_test_command", value: "bun test" })` → coda.json updated.

---

## F6 (Medium): Build loop auto-advance instruction

**Problem:** Agent finishes task N but doesn't automatically start task N+1.

**Fix:** In the BUILD phase context injected via `before_agent_start`, add explicit instruction:

```
After completing a task:
1. Mark it complete with coda_update (status: "complete")
2. Add a Summary section with coda_edit_body
3. Check coda_status for the next pending task
4. If there are more tasks, read the next one with coda_read and begin it
5. If all tasks are complete, use coda_advance to move to verify
```

**Files:** `workflow/context-builder.ts` or `workflow/phase-runner.ts` — the BUILD phase system prompt.

**Test:** Agent completes task 1 and starts task 2 without being nudged.

---

## F8 (Medium): coda_report_findings instruction

**Problem:** Agent doesn't know to call `coda_report_findings` after module analysis.

**Fix:** In the post-build context (or wherever module prompts are injected), add:

```
After completing your analysis, submit your findings using the coda_report_findings tool.
Format your findings as a JSON array of objects with: check, severity, finding, assumption (optional).
This is required for the build→verify gate to pass.
```

**Files:** Module prompt footer (appended by dispatcher) or `workflow/context-builder.ts`.

**Test:** After BUILD completes, agent calls coda_report_findings without being told.

---

## Build Order

1. F4 (state.json) — 15 min
2. F2 (coda_config tool) — 30 min
3. F6 (build context instruction) — 15 min
4. F8 (findings instruction) — 15 min
5. Regression: all existing tests pass
6. Quick smoke test: `/coda forge` → verify state.json + coda_config works

Then proceed to Phase 1 (core types + finding schema).
