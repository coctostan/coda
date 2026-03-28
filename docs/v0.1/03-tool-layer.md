# M3: Tool Layer — v0.1 Spec

**Package:** `coda` → `src/tools/`
**Depends on:** M1 (data), M2 (state)

## Purpose

LLM-callable tools that are the only way to modify `.coda/` data. The LLM never writes directly to `.coda/` — tools validate and write on its behalf.

## v0.1 Tools

### coda_create
Create a new mdbase record (issue, plan, task, record, reference).

```typescript
coda_create({
  type: "issue" | "plan" | "task" | "record" | "reference",
  fields: Record<string, any>,  // frontmatter fields
  body?: string                  // optional initial body
}) → { path: string, id?: string }
```

- Generates sequential AC IDs for issues ("AC-1", "AC-2")
- Creates directory structure (.coda/issues/{slug}/, tasks/)
- Validates required fields per type

### coda_update
Update frontmatter fields on an existing record. Never touches the body.

```typescript
coda_update({
  record: string,               // path relative to .coda/
  fields: Record<string, any>   // partial update, merged with existing
}) → { updated_fields: string[] }
```

### coda_read
Read a record with optional section-level body retrieval.

```typescript
coda_read({
  record: string,
  section?: string              // optional: return only this ## section
}) → { frontmatter: Record<string, any>, body: string }
```

### coda_advance
Request phase transition. Checks gates.

```typescript
coda_advance({
  target_phase: string
}) → { success: boolean, previous_phase?: string, new_phase?: string, gate_name?: string, reason?: string }
```

- Reads gate data from M1 (data layer)
- Passes to M2 gate check
- On success: updates issue.phase in mdbase + state.json
- On failure: returns which gate failed and why

### coda_status
Current state snapshot.

```typescript
coda_status() → {
  focus_issue: string | null,
  phase: string | null,
  current_task: number | null,
  completed_tasks: number[],
  tdd_gate: string,
  next_action: string            // human-readable suggestion
}
```

### coda_run_tests
Execute test command, observe results, manage TDD gate.

```typescript
coda_run_tests({
  mode: "tdd" | "suite",
  pattern?: string
}) → {
  exit_code: number,
  passed: boolean,
  output: string,                // truncated stdout+stderr
  command: string
}
```

- `mode: "tdd"` uses `coda.json → tdd_test_command`, affects TDD gate
- `mode: "suite"` uses `coda.json → full_suite_command`, no gate effect
- TDD gate: exit_code ≠ 0 → unlocked; exit_code == 0 → locked
- Missing command config → error (never silently degrade)

### coda_edit_body
Section-aware body editing for .coda/ records.

```typescript
coda_edit_body({
  record: string,
  op: "append_section" | "replace_section" | "append_text",
  section?: string,
  content: string,
  create_if_missing?: boolean
}) → { diff_summary: string }
```

- Never touches frontmatter
- `append_section`: adds new ## heading at end
- `replace_section`: replaces content under existing ## heading
- `append_text`: appends raw text at end (no heading)

### Write-Gate

Not a tool — a `tool_call` interceptor.

**Rule 1: .coda/ protection**
Any `write` or `edit` tool call targeting a `.coda/**` path → blocked with reason: "Use coda_* tools to modify .coda/ files"

**Rule 2: TDD gate**
When `tdd_gate == "locked"` (default per task):
- `write`/`edit` to test files → allowed
- `write`/`edit` to non-test files → blocked with reason: "Write a failing test first. Run coda_run_tests to unlock."

When `tdd_gate == "unlocked"` (after failing test observed):
- All writes allowed
- Re-locks when `coda_run_tests` records passing tests

**Test file detection:** file path matches `*.test.*`, `*.spec.*`, `__tests__/**`, or `test/**`

## v0.1 Deferred

- `coda_query` — cross-type queries (find issues by topic, tasks by AC)
- `coda_signal` — workflow signals (task_done, etc.) — v0.1 uses coda_advance + direct state updates
- VCS commit interception (v0.1 allows manual git)

## Files

```
packages/coda/src/tools/
├── coda-create.ts
├── coda-update.ts
├── coda-read.ts
├── coda-advance.ts
├── coda-status.ts
├── coda-run-tests.ts
├── coda-edit-body.ts
└── write-gate.ts
```

## Tests

Each tool tested with mocked M1/M2 dependencies:
- coda_create produces valid records
- coda_update merges without clobbering
- coda_advance passes/fails gates correctly
- coda_run_tests manages TDD gate state
- coda_edit_body handles section operations
- Write-gate blocks .coda/ writes and enforces TDD
