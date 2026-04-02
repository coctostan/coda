# v0.2.2 — Operational Fixes for Live Readiness

**Goal:** Fix all blockers and important issues so CODA can run a real project E2E.

**Prerequisite:** v0.2 passing (255 tests).

## Priority Order

Fix blockers first (will crash), then important (will confuse), then minor.

---

## Blockers

### LIVE-01: /coda forge is stubbed

**Problem:** No way to scaffold a project. Greenfield flow exists in spec but wasn't implemented.

**Fix:** Implement minimal greenfield forge:
1. Detect empty project (no `.coda/`)
2. Ask 3-5 questions conversationally (what, who, tech stack, v1 scope, test command)
3. Scaffold `.coda/` directory structure
4. Generate `ref-system.md` and `ref-prd.md` from answers
5. Generate `coda.json` with test commands from user input
6. Create first milestone

**Scope:** This is the minimal v0.1 forge spec from `docs/v0.1/05-forge-greenfield.md`. Not the full FORGE with DESIGN advisors and CHALLENGE — just the conversational scaffolding.

**Files:** `packages/coda/src/forge/greenfield.ts`, `packages/coda/src/forge/scaffold.ts`, `packages/coda/src/pi/commands.ts`

**Test:** `/coda forge` on empty directory → `.coda/` created with valid structure + ref docs.

---

### LIVE-02: Findings never parsed at runtime

**Problem:** `parseAndCheckFindings()` exists but is never called. Module prompts get injected but agent responses aren't parsed for JSON findings. `module-findings.json` is never written. Gates never see module blocks.

**Fix:** Wire the parsing into the workflow layer:
1. After any phase session where module prompts were injected, capture the agent's response
2. Call `parseAndCheckFindings(agentResponse, hookPoint)` from the dispatcher
3. Persist the `HookResult` to `module-findings.json`
4. When `coda_advance` is called, read `module-findings.json` and populate `moduleBlockFindings` in `GateCheckData`

**Key question:** How to capture the agent's response? The `agent_end` hook fires when the agent finishes. The response content should be available. If not via Pi API, fall back to reading the last message from the session.

**Files:** `packages/coda/src/workflow/module-integration.ts`, `packages/coda/src/pi/hooks.ts`, `packages/coda/src/tools/coda-advance.ts`

**Test:** Inject security prompt, agent produces JSON findings, findings appear in `module-findings.json`.

---

### LIVE-05: Path traversal in coda_read/update/edit_body

**Problem:** `../` in record paths escapes the `.coda/` sandbox. Can read/write arbitrary files.

**Fix:** Sanitize all record paths in every tool:
```typescript
function sanitizeRecordPath(record: string, codaRoot: string): string {
  const resolved = resolve(codaRoot, record);
  if (!resolved.startsWith(codaRoot)) {
    throw new Error(`Path traversal blocked: ${record} resolves outside .coda/`);
  }
  return resolved;
}
```

Apply in: `coda-read.ts`, `coda-update.ts`, `coda-edit-body.ts`, `coda-create.ts`.

**Test:** `coda_read({ record: "../../etc/passwd" })` → error. `coda_read({ record: "issues/my-issue" })` → works.

---

### LIVE-06: Shell injection in coda_run_tests

**Problem:** Test command is interpolated raw into `sh -c`. User-controlled pattern could inject shell commands. Also uses ambient cwd which may be wrong.

**Fix:**
1. Use `execFile` or `spawn` with argument arrays instead of `sh -c` string interpolation
2. Or at minimum, shell-escape the pattern before interpolation
3. Set explicit cwd to the project root (not ambient)

```typescript
// Instead of:
exec(`sh -c "${testCommand} ${pattern}"`)

// Use:
const args = pattern ? [testCommand, pattern] : [testCommand];
execSync(args.join(' '), { cwd: projectRoot, shell: true });
// Or better: split testCommand into command + args properly
```

**Test:** `coda_run_tests({ mode: "tdd", pattern: "; rm -rf /" })` → no shell injection. Command runs from project root.

---

## Important

### LIVE-03: post-task and post-build hooks never fire

**Problem:** Only pre-plan and pre-build module prompts are wired in the workflow. post-task and post-build never dispatch.

**Fix:** Add dispatch calls:
1. In `build-loop.ts`: after each task completes, dispatch `post-task` hooks
2. In `build-loop.ts` or `phase-runner.ts`: after all tasks complete, dispatch `post-build` hooks
3. Wire the response parsing (depends on LIVE-02 fix)

**Files:** `packages/coda/src/workflow/build-loop.ts`

**Test:** TDD module's post-task prompt fires after a task. Security module's post-build prompt fires after BUILD.

---

### LIVE-04: create_if_missing ignored in coda_edit_body

**Problem:** Schema advertises `create_if_missing` parameter but implementation ignores it. `replace_section` on a missing section fails instead of creating it.

**Fix:** In `coda-edit-body.ts`, check `create_if_missing`:
```typescript
if (op === 'replace_section' && !sectionExists && create_if_missing) {
  // Append the section instead of erroring
  body = appendSection(body, section, content);
}
```

**Test:** `coda_edit_body({ op: "replace_section", section: "Summary", create_if_missing: true })` on a record without a Summary section → section created.

---

### LIVE-07: process.cwd() for .coda/ location

**Problem:** Extension uses `process.cwd()` to find `.coda/`. If Pi is launched from a different directory, it can't find the project.

**Fix:** Resolve `.coda/` relative to the extension's working directory or use Pi's project root if available. Fall back to `process.cwd()` but log a warning if `.coda/` not found.

```typescript
function findCodaRoot(): string {
  // Try Pi's project root first (if API provides it)
  // Then try process.cwd()
  // Walk up parent directories looking for .coda/
  // Error if not found
}
```

**Test:** Pi launched from subdirectory → still finds `.coda/` in project root.

---

### LIVE-08: No try/catch around state/record I/O

**Problem:** Malformed JSON in `state.json` or invalid frontmatter in a record crashes the extension.

**Fix:** Wrap all file I/O in try/catch:
```typescript
function loadState(path: string): CodaState | null {
  try {
    // ... existing logic ...
  } catch (e) {
    console.error(`Failed to load state: ${e.message}`);
    return null;  // or return createInitialState()
  }
}
```

Apply to: `store.ts` (state), `records.ts` (frontmatter parsing), all tool handlers.

**Test:** Corrupt `state.json` → extension loads with default state, doesn't crash.

---

### LIVE-10: Bash write-gate is heuristic

**Problem:** Agent can bypass `.coda/` write protection with commands like `cp`, `mv`, `tee`, `python -c`, etc. Only `>` redirect is caught.

**Fix:** Expand the bash interception pattern:
```typescript
const CODA_WRITE_PATTERNS = [
  />\s*\.coda\//,           // redirect
  />\s*['"]\.coda\//,       // quoted redirect
  /\btee\b.*\.coda\//,      // tee
  /\bcp\b.*\.coda\//,       // cp
  /\bmv\b.*\.coda\//,       // mv
  /\bln\b.*\.coda\//,       // ln
  /\binstall\b.*\.coda\//,  // install
  /\brsync\b.*\.coda\//,    // rsync
  /\bdd\b.*of=.*\.coda\//,  // dd
  /python.*open.*\.coda/,   // python file write
  /node.*fs.*\.coda/,       // node file write
];
```

**Acknowledge:** This is inherently a cat-and-mouse game. The heuristic will never be perfect. The primary defense is the `tool_call` interception on `write`/`edit` tools. The bash interception is defense-in-depth.

**Test:** `cp /tmp/evil .coda/hack.md` → blocked. `tee .coda/hack.md` → blocked.

---

## Minor

### LIVE-09: Lexicographic plan sort

**Problem:** `plan-v10.md` sorts before `plan-v2.md`.

**Fix:** Natural sort:
```typescript
function naturalSort(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}
```

**Test:** Plans v1 through v11 sort correctly.

---

## Build Order

1. LIVE-05 (path traversal) — security, quick fix
2. LIVE-06 (shell injection) — security, quick fix  
3. LIVE-08 (try/catch I/O) — stability, quick fix
4. LIVE-04 (create_if_missing) — feature gap, quick fix
5. LIVE-09 (plan sort) — minor, quick fix
6. LIVE-07 (cwd resolution) — medium effort
7. LIVE-10 (bash gate) — medium effort
8. LIVE-01 (forge) — largest effort, new feature
9. LIVE-02 + LIVE-03 (findings parsing + hook dispatch) — medium effort, interdependent
10. Regression test run (all 255+ existing tests still pass)
11. E2E real project test
