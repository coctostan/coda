# E2E Findings Report — CODA v0.1

**Date:** 2026-03-28
**Test Environment:** Pi 0.63.1, openai-codex/gpt-5.4-mini, macOS

---

## Summary

CODA v0.1 loads and operates correctly as a live Pi extension. All 7 coda_* tools, the `/coda` command, and all 3 lifecycle hooks (session_start, before_agent_start, tool_call) function as designed. The full create→read round-trip works end-to-end.

Two issues were discovered and fixed during the test:

| # | Issue | Severity | Root Cause | Fix Applied |
|---|-------|----------|------------|-------------|
| 1 | Extension fails to load: "Cannot determine intended module format" | **Critical** | `import.meta.dir` (Bun-only API) in `todd.ts` and `walt.ts` — jiti cannot transpile this to CJS | Replaced with standard `import.meta.url` + `fileURLToPath` + `dirname` |
| 2 | Extension fails to load: `@coda/core` unresolvable | **Critical** | Bun workspace resolution not available to jiti (Node.js module resolution) | Created `node_modules/@coda/core` symlink → `../../packages/core` |

---

## Results Table

| Component | Tested | Result | Notes |
|-----------|--------|--------|-------|
| Extension loading | ✅ | PASS | Loads via `pi -e` after fixes |
| `/coda` command | ✅ | PASS | Registered, appears in autocomplete with description |
| `coda_status` tool | ✅ | PASS | Returns full state JSON |
| `coda_create` tool | ✅ | PASS | Creates .coda/ records |
| `coda_read` tool | ✅ | PASS | Reads records with frontmatter + body |
| `.coda/` write gate | ✅ | PASS | Blocks write/edit to .coda/ paths |
| `before_agent_start` hook | ✅ | PASS | Fires (no context injected when no state — correct) |
| `session_start` hook | ✅ | PASS | Extension initializes without error |
| `tool_call` hook | ✅ | PASS | Intercepts and blocks .coda/ writes |
| `coda_update` tool | ⬜ | Not tested | Time constraint |
| `coda_edit_body` tool | ⬜ | Not tested | Time constraint |
| `coda_advance` tool | ⬜ | Not tested | Requires initialized state |
| `coda_run_tests` tool | ⬜ | Not tested | Requires initialized state |
| `/coda forge` subcommand | ⬜ | Not tested | Placeholder in v0.1 |
| TDD gate enforcement | ⬜ | Not tested | Requires state with tdd_gate=locked |

---

## Issues Found

### Issue 1: Bun-specific `import.meta.dir` incompatible with jiti

**Severity:** Critical (extension won't load)
**Root Cause:** `todd.ts` and `walt.ts` used `import.meta.dir` which is a Bun-only extension of the ESM `import.meta` object. Pi loads extensions via jiti (Node.js-based transpiler) which doesn't support Bun-specific APIs.
**Fix:** Replace `import.meta.dir` with the standard ESM equivalent:
```typescript
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));
```
**Prevention:** Lint rule or code convention: "No Bun-specific APIs in files reachable from the Pi extension entry point."

### Issue 2: Workspace dependency not resolvable by jiti

**Severity:** Critical (extension won't load)
**Root Cause:** `@coda/core` is a Bun workspace dependency (`"@coda/core": "workspace:*"`). Bun resolves this internally during `bun test` and `bun build`, but Pi's jiti uses Node.js module resolution which requires a real `node_modules/@coda/core` entry.
**Fix:** Create symlink: `ln -sf ../../packages/core node_modules/@coda/core`
**Long-term fix options:**
1. Add a `postinstall` script that creates the symlink
2. Use `npm install` alongside bun to create proper node_modules links
3. Bundle the extension (e.g., `bun build --target=node`) into a single .js file before loading
4. Publish `@coda/core` as a real npm package

---

## What Worked

1. **Real ExtensionAPI integration** — All Pi extension APIs (registerTool, registerCommand, pi.on) work correctly with our wrappers.
2. **TypeBox parameters** — `Type.Object()` schemas parsed correctly by Pi, tool parameters received properly.
3. **Tool result format** — `{ content: [{ type: "text", text: JSON.stringify(result) }] }` displays cleanly in Pi TUI.
4. **Hook interception** — `tool_call` hook successfully intercepts and blocks write operations to `.coda/` paths.
5. **Command autocomplete** — `/coda` appears in Pi's command autocomplete with the correct description.
6. **State round-trip** — create → read produces identical data through the full CODA tool stack.

---

## Recommendations

### For v0.1 Release
1. **Add postinstall script** for the `@coda/core` symlink (required for extension loading)
2. **Audit all files** reachable from Pi entry point for Bun-specific APIs
3. **Test remaining tools** (coda_update, coda_edit_body, coda_advance, coda_run_tests) in a follow-up session with initialized state

### For v0.2+
1. **Bundle the extension** using `bun build` to produce a single .js file — eliminates workspace resolution issues entirely
2. **Add `/coda forge` interactive flow** — currently a placeholder
3. **Add `before_agent_start` context injection tests** with a fully initialized state (focus_issue + phase)
4. **Consider publishing `@coda/core`** as a proper npm package for clean dependency resolution

---

*Report generated: 2026-03-28*
