# E2E Compounding Test — Findings

**Date:** 2026-04-16
**Test dir:** ~/pi/workspace/coda-test-shortener
**Model:** openai-codex/gpt-5.4
**Script:** cmux-v08-test-scripts.md — Script A
**Pi version:** 0.67.2
**Sessions:** 3 total (Session 1: GPT-5.4 + megapowers interference; Session 2: GPT-5.4 clean; Session 3: GPT-5.4 corrected approach)

## Results Summary

| Phase | Issue 1 | Issue 2 | Notes |
|-------|---------|---------|-------|
| FORGE | ✅ Pass | N/A | Outer agent ran `/coda forge`; detected brownfield (bare skeleton has files) |
| SPECIFY | ⚠️ Retroactive | ✅ Immediate | Issue 1: agent built code first, created issue after 3 nudges. Issue 2: created issue immediately |
| PLAN | ⚠️ Retroactive | ✅ Created | Plans written to `.coda/` but not used to drive development |
| BUILD | ✅ Pass | ✅ Pass | Code quality good — 5 tests (Issue 1), 7 tests (Issue 2), TypeScript strict clean |
| VERIFY | ✅ Pass | ✅ Pass | Tests + tsc passing; manual verification successful |
| UNIFY | ❌ No artifacts | ❌ No artifacts | Completion records written; **zero overlays, zero reference docs** |
| FUNCTIONAL | ✅ Pass | ✅ Pass | POST /shorten, GET /:code redirect, GET /stats/:code all work correctly |

## Critical Findings

### F1: `/coda forge` is not agent-callable (CONFIRMED from Session 1-2)
**Severity:** Critical | **Category:** Architecture

`/coda forge` is registered via `registerCommand` — a Pi slash command, not a tool. No `coda_forge` tool exists. The corrected approach in Session 3 had the outer agent (human/PM) run `/coda forge` directly. This works but means **forge cannot be part of an autonomous agent workflow**.

### F2: No "focus issue" tool exists
**Severity:** Critical | **Category:** Architecture

After forge creates `.coda/`, the agent must focus an issue to begin the lifecycle. But there is no agent-callable tool to focus an issue. The only mechanism is `/coda activate <slug>`, another slash command. The GPT-5.4 agent correctly identified this gap and worked around it by **directly editing `.coda/state.json`** — which should be blocked by the write gate but wasn't (the agent used standard `write` tool, not `coda_create`).

### F3: Agent builds before engaging CODA lifecycle
**Severity:** High | **Category:** Prompt quality

In all 3 sessions, the agent's first instinct was to build the requested feature immediately, without creating a CODA issue or following the lifecycle. The CODA injected prompts (via extension system prompt) were not strong enough to override the agent's "just build it" default behavior.

- **Issue 1:** Built entire URL shortener, then retroactively created CODA artifacts after 3 nudges
- **Issue 2:** Created CODA issue immediately (learned from nudges), but still built code before advancing through lifecycle phases

### F4: Agent reads CODA source code instead of following prompts
**Severity:** High | **Category:** Prompt quality / Agent UX

The agent spent significant context (~15% of total) reading CODA source code files to understand how the tools work, rather than following the injected guidance. It read:
- `coda-create.ts` to understand how to create issues
- `v08-e2e.test.ts` to understand the lifecycle flow
- Various workflow files

This suggests the injected prompts don't provide enough information about tool usage patterns.

### F5: UNIFY produces zero compounding artifacts
**Severity:** Critical | **Category:** Compounding engine

Neither issue produced:
- ❌ Module overlays (`.coda/modules/*.local.md`) — **the core compounding mechanism**
- ❌ Reference docs (`ref-system.md`) — **the system knowledge base**

Completion records were written with reasonable content (summaries, decisions, patterns), but the UNIFY runner's 5 mandatory actions (merge spec delta, review reference docs, capture knowledge for compounding, update milestones, write completion record) only produced the completion record. The other 4 actions were not executed.

The `unify_review_status: approved` in the completion records suggests the gate auto-approved, but the artifacts that should have been created during UNIFY were never generated.

### F6: `coda_run_tests` broken — "Bun is not defined"
**Severity:** High | **Category:** Bug

`coda_run_tests` fails with `ReferenceError: Bun is not defined` even though `bun test` works from the shell. The test runner likely uses Node's `child_process` to spawn tests but doesn't resolve `bun` from PATH correctly, or spawns in a Node context where Bun globals aren't available.

This means the TDD gate (`tdd_gate: locked`) never unlocks, and CODA can't verify test results programmatically.

### F7: Write gate does NOT block direct `.coda/` edits
**Severity:** High | **Category:** Security

The agent used the standard `write` tool (not `coda_create`) to directly edit `.coda/state.json`. The write gate that should protect `.coda/` from direct modification did not fire. This was observed in Session 1 (where the gate DID block direct writes) but not in Session 3.

**Possible cause:** The write gate may only block file *creation* in `.coda/`, not edits to existing files. Or the gate configuration changed between sessions.

### F8: Megapowers extension interference (Session 1 only)
**Severity:** Medium | **Category:** Test environment

Session 1 had megapowers enabled, which created `.megapowers/` directories, injected its own prompts, and confused the CODA lifecycle. Session 3 disabled megapowers via `/mega off` command. **Recommendation:** For CODA testing, always disable megapowers.

## Compounding Evidence

### Overlay Quality
**Result: No overlays produced.**

Neither UNIFY pass created any `.coda/modules/*.local.md` files. The compounding engine's core artifact — module overlays that capture project-specific patterns — was never generated. Without overlays, there is nothing to compound.

### Cross-Issue Improvement
**Mixed result.**

Issue 2 went smoother than Issue 1 in terms of CODA engagement:
- Issue 2: Agent created CODA issue immediately (no nudges needed)
- Issue 2: Agent followed same file patterns from Issue 1 (same source structure, same test organization)
- Issue 2: ~3 minutes of build time vs ~5 minutes for Issue 1

However, this improvement came from **in-conversation learning** (the nudges in Issue 1 taught the agent), not from CODA's compounding system (which produced no artifacts).

### Knowledge Carry-Forward
**No CODA-mediated carry-forward.**

The agent reused patterns from Issue 1 during Issue 2, but this was conversation memory, not CODA overlays. The `assemblePrompts()` function would have injected overlay content if overlays existed, but since none were created, Issue 2 got the same prompts as Issue 1.

Completion records DO contain useful "Decisions" and "Patterns" sections, but these are not consumed by the prompt assembly pipeline — they're write-only documentation.

## Prompt Effectiveness

### Did the agent figure out what to do without being told which tools to call?
**Partially.** The agent discovered `coda_create`, `coda_status`, and `coda_advance` on its own after being nudged to use CODA. But it never discovered how to focus an issue or run the full lifecycle without manually patching state.

### Where did the agent get confused?
1. **Forge vs tools:** Agent didn't know `/coda forge` was needed (Session 1-2) or that it was a slash command
2. **Focus issue:** No tool to focus an issue — had to edit state.json directly
3. **Lifecycle flow:** Agent didn't understand the phase sequence from prompts alone — needed the script's explicit list (SPECIFY → PLAN → BUILD → VERIFY → UNIFY → DONE)
4. **UNIFY actions:** Agent didn't know what UNIFY was supposed to produce (overlays, reference updates)

### Did the CODA injected guidance actually help?
**Minimally.** The forge output provided a clear "Next: Brownfield SCAN" instruction, but the agent ignored it in favor of building code. The lifecycle prompts at phase boundaries (via `coda_advance`) provided some structure, but the agent didn't follow them naturally.

The most helpful guidance was the `coda_status` response showing `"next_action": "Focus an issue to begin"` — this clearly told the agent what was needed but didn't tell it HOW.

## Agent Experience Observations

### How natural was the interaction?
The code-building interaction was completely natural — GPT-5.4 produced well-structured TypeScript with good separation of concerns, comprehensive tests, and clean architecture. The URL shortener works perfectly.

The CODA lifecycle interaction was unnatural. The agent needed explicit nudges and ended up working around the system rather than through it. A real developer would have the same frustration: "I can see the issue files but can't figure out how to activate the lifecycle."

### What felt like friction?
1. **No focus-issue tool** — biggest friction point
2. **Build-first mentality** — agent's natural behavior conflicts with CODA's lifecycle-first approach
3. **UNIFY is opaque** — agent doesn't know what artifacts to produce
4. **coda_run_tests broken** — TDD gate is permanently locked

### Where would a real developer get frustrated?
A real developer using CODA through Pi would hit the same `/coda forge` + `/coda activate` dependency. The slash commands work for humans (type them), but for any automated/agent workflow, these are blocking.

## Issues Found

| # | Finding | Severity | Category | Status |
|---|---------|----------|----------|--------|
| F1 | `/coda forge` not agent-callable | Critical | Architecture | Known (Session 1-2) |
| F2 | No "focus issue" tool | Critical | Architecture | New |
| F3 | Agent builds before CODA lifecycle | High | Prompt quality | Known (Session 1-2) |
| F4 | Agent reads CODA source to understand tools | High | Prompt quality | Known (Session 1) |
| F5 | UNIFY produces zero overlays/reference docs | Critical | Compounding engine | New |
| F6 | `coda_run_tests` "Bun is not defined" | High | Bug | New |
| F7 | Write gate doesn't block `.coda/` edits | High | Security | Regression from Session 1 |
| F8 | megapowers interference | Medium | Test environment | Known (Session 1) |

## Artifacts

### `.coda/` files
- `coda.json` — config with gates set to auto
- `state.json` — lifecycle state (focus: Issue 2, phase: done)
- `issues/implement-core-url-shortening-and-redirect-flow.md` + plan + 2 tasks
- `issues/add-analytics-and-stats-endpoint-for-short-urls.md` + plan + 2 tasks
- `records/implement-core-url-shortening-and-redirect-flow-completion.md`
- `records/add-analytics-and-stats-endpoint-for-short-urls-completion.md`
- **No reference docs** (reference/ dir empty)
- **No module overlays** (modules/ dir doesn't exist)

### Source files
- `src/server.ts` — HTTP server with Bun.serve
- `src/shortener.ts` — Code generation logic
- `src/storage.ts` — JSON file persistence with analytics

### Test files
- `tests/server.test.ts` — 7 tests, 19 assertions, all passing

### Git history
- `329f0f5` init bare project
- `7ebaa8a` task 1: task-1

## Conclusion

**The compounding engine does not compound in practice.** While the code infrastructure exists (overlay file format, prompt assembly, UNIFY runner), the end-to-end flow from "agent builds a feature" to "overlays capture knowledge" to "next feature benefits from overlays" is broken at multiple points:

1. **Entry gap:** No agent-callable forge or focus-issue tool
2. **Lifecycle gap:** Agent doesn't follow the CODA lifecycle naturally — builds first, tracks retroactively
3. **UNIFY gap:** Even when the lifecycle reaches UNIFY, no overlays or reference docs are produced
4. **Compounding gap:** Without overlays, there's nothing to inject into future prompts

The functional product (URL shortener with analytics) works perfectly, demonstrating that GPT-5.4 is a capable builder. The issue is that CODA's lifecycle and compounding systems aren't integrated tightly enough to influence the agent's natural behavior.

### Recommended Fixes (Priority Order)
1. **Add `coda_focus` tool** — Agent-callable way to focus an issue (critical blocker)
2. **Add `coda_forge` tool** — Agent-callable forge (or make forge a tool, not just a slash command)
3. **Fix UNIFY to actually produce overlays** — The UNIFY runner should generate overlays from completion record patterns/decisions
4. **Fix `coda_run_tests`** — Resolve Bun PATH/context issue
5. **Strengthen lifecycle prompts** — Make "create issue before building" a stronger injected instruction
6. **Fix write gate for `.coda/` edits** — Block all direct writes, not just file creation
