# v0.3.1 — Gap Closure & Missing Features

**Goal:** Close gaps between the v7 spec and what's actually built. Add the 3 remaining modules. Fix items glossed over during rapid v0.1-v0.3 development.

**Current state:** 433 tests, 5 modules firing, full lifecycle proven via E2E.

---

## Gap Analysis: Spec vs Built

### Missing Tools

| Tool | Spec Says | Built? | Priority | Notes |
|------|-----------|--------|----------|-------|
| `coda_query` | "mdbase query (issues, tasks, decisions, references)" | ❌ Not built | **Medium** | Agent currently reads records one at a time with coda_read. Query enables: find all issues by topic, find tasks by AC ID, list all decisions. Useful for PLAN/REVIEW context. |
| `coda_signal` | "Workflow signals: task_done" | ❌ Not built | **Low** | coda_update on task status + coda_advance handles this. But spec intended coda_signal to encapsulate task completion logic (mark complete, trigger post-task hooks, update state.completed_tasks). Currently scattered. |

### Missing Commands

| Command | Spec Says | Built? | Priority | Notes |
|---------|-----------|--------|----------|-------|
| `/coda activate <id>` | "Start working an issue" | ❌ | **Medium** | Currently agent sets focus_issue by creating an issue. No way to switch between issues or pick up an existing one. |
| `/coda pause` | "Save state for later resume" | ❌ | **Low (v0.5)** | Roadmap says v0.5. |
| `/coda resume` | "Pick up where left off" | ❌ | **Low (v0.5)** | Roadmap says v0.5. |
| `/coda audit` | "Spec drift detection" | ❌ | **Low (v0.11)** | Roadmap says v0.11. |
| `/coda new <type>` | Subcommand with type argument | ⚠️ Partial | **Low** | `/coda new` exists but may not pass the type to coda_create. |

### Missing Infrastructure

| Feature | Spec Says | Built? | Priority | Notes |
|---------|-----------|--------|----------|-------|
| **VCS integration** | "Feature branch per issue, commit per task" | ❌ Not built | **High** | No git operations anywhere in the codebase. The spec says: create branch on issue activation, commit after each BUILD task, branch ready for PR on DONE. This is fundamental to the workflow. |
| **State reconstruction** | "reconstructFromData() — find active issue, rebuild state.json" | ❌ Not built | **Low** | Useful for crash recovery. Not critical for v0.3.1 but noted. |
| **post-task hooks** | Module dispatcher should fire after each BUILD task | ⚠️ Wired? | **Medium** | TDD post-task prompt exists but unclear if dispatcher.parseAndCheckFindings runs after each task or just at post-build. |

### Missing Modules (from v0.3 overview)

| Module | Status | Priority |
|--------|--------|----------|
| Architecture | ✅ Prompt files exist, fires at runtime | Done |
| Quality | ✅ Prompt files exist, fires at runtime | Done |
| Knowledge | ✅ Prompt files exist, fires at runtime | Done |

Wait — the E2E showed all 5 modules firing. Let me check if the architecture/quality/knowledge modules were added as part of v0.3 or if they were supposed to be v0.3.1.

From the v0.3 overview: "v0.3 ships 2 modules (security + tdd). v0.3.1 adds 3 more."

But the E2E shows all 5 firing. So either they were added during v0.3 development (deviation from plan) or they were already registered. Either way — they exist and work. No gap here.

### Other Gaps

| Feature | Spec Says | Built? | Priority |
|---------|-----------|--------|----------|
| **Old todd.md/walt.md cleanup** | "Delete old flat files when new system wired" | ⚠️ Check | **Low** | The old `modules/prompts/todd.md` and `modules/prompts/walt.md` may still exist alongside the new subdirectory structure. And `packages/coda/src/modules/todd.ts` / `walt.ts` (the old hardcoded prompts) should be removed if replaced by the registry. |
| **coda_create AC ID generation** | "Generates sequential AC IDs (AC-1, AC-2)" | ⚠️ Check | **Medium** | Spec says coda_create should auto-generate AC IDs. Currently the agent provides them manually. |
| **Module findings context summarization** | "Summarized across phases, full detail within phase" | ⚠️ Partial | **Medium** | module-findings.json is written but the context builder may not summarize them for cross-phase injection. |

---

## v0.3.1 Scope

### Must Do (this version)

1. **VCS integration** — branch creation on issue activation, commit after each BUILD task. This is in every spec version and is completely missing. (High effort, high value)

2. **`/coda activate`** — set focus_issue on an existing issue, create feature branch. Required for the VCS integration to work. (Medium effort)

3. **`coda_query`** — basic queries: list all issues, list tasks for an issue, find by topic. Useful for the agent to navigate the project. (Medium effort)

4. **Old module cleanup** — remove `modules/prompts/todd.md`, `modules/prompts/walt.md`, and `packages/coda/src/modules/todd.ts`/`walt.ts`/`index.ts` if the registry has replaced them. (Low effort)

5. **Module findings in cross-phase context** — ensure context-builder.ts summarizes module findings when injecting context for later phases (e.g., VERIFY should see post-build findings summary). (Low effort)

### Defer

| Feature | Defer To | Reason |
|---------|----------|--------|
| `coda_signal` | v0.5 | coda_update + coda_advance covers the use case |
| `/coda pause` + `/coda resume` | v0.5 | Per roadmap |
| `/coda audit` | v0.11 | Per roadmap |
| State reconstruction | v0.5 | Not critical yet |
| AC ID auto-generation | v0.5 | Agent handles it manually, works fine |

---

## Build Order

| Phase | What | Effort |
|-------|------|--------|
| 1 | Old module cleanup (todd.md, walt.md, old TS files) | 15 min |
| 2 | `/coda activate` command + focus_issue management | 1 hr |
| 3 | VCS integration: branch on activate, commit on task complete | 2 hr |
| 4 | `coda_query` tool: list issues, list tasks, find by topic | 1 hr |
| 5 | Module findings context summarization in context-builder | 30 min |
| 6 | Regression test run | 15 min |
| 7 | E2E smoke test (does VCS work in a real lifecycle?) | 30 min |

**Total estimated: ~5.5 hours**

---

## Key Design Notes

### VCS Integration

Per the v7 spec:
- On `/coda activate` or issue creation: `git checkout -b feat/{slug}` (or `fix/` for bugfix)
- After each BUILD task completes: `git add . && git commit -m "task {id}: {title}"`
- On DONE: branch exists, ready for manual PR/merge. No auto-PR in v0.3.1.
- All git operations go through a `vcs.ts` module, not scattered across tools.

```
packages/coda/src/workflow/
├── vcs.ts               # NEW: createBranch, commitTask, getCurrentBranch
```

### coda_query

```typescript
coda_query({
  type: "issue" | "task" | "plan" | "record" | "reference" | "decision",
  filter?: {
    issue?: string,      // filter tasks/plans by issue slug
    topic?: string,      // filter by topic
    status?: string,     // filter by status
  }
}) → { records: Array<{ path: string, frontmatter: object }> }
```

Simple listing + filtering. Not a full query language. Returns frontmatter only (not body) to keep responses compact.
