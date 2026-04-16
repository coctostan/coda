# PAUL Handoff

**Date:** 2026-04-15 21:30 EDT
**Status:** paused

---

## READ THIS FIRST

You have no prior context. This document tells you everything.

**Project:** coda-ecosystem
**Core value:** Enabling developers to build durable, maintainable software through disciplined agent-assisted workflows

---

## Current State

**Version:** v0.9.0
**Phase:** 52 of 53 — Greenfield Compounding Test (Script A)
**Plan:** 52-01 — APPLY in progress, paused after two CMUX discovery attempts

**Loop Position:**
```text
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ○        ○     [APPLY paused — restarting with corrected approach]
```

## What Was Done

### Two CMUX attempts produced critical discovery findings:

**Session 1 (megapowers interference):**
- Inner agent (GPT-5.4) built the entire URL shortener before touching CODA (build-first mentality)
- megapowers extension interfered — `.megapowers/` dir, `megapowers_signal` calls
- Agent spent 37% context (5M tokens) reading CODA source code trying to understand it
- Write gate correctly blocked direct `.coda/` writes
- Agent eventually found `coda_create`, `coda_status` but not `/coda forge`
- Session killed due to megapowers interference

**Session 2 (clean, megapowers disabled via .pi/settings.json):**
- Inner agent tried `coda_create` immediately (better!) but with wrong args
- Corrected and created issue, but no scaffold (no forge)
- `coda_advance` and `coda_status` both said "run coda forge to initialize"
- Agent tried `command -v coda`, `pi -p "/coda forge"`, `bun -e 'import scaffoldCoda...'` — never understood `/coda forge` is a Pi slash command
- 3 nudges exhausted; agent explicitly stated: "I do not have a native way to type Pi slash commands"

### Root cause discovered:

**`/coda forge` is a slash command (human-only), not a tool (agent-callable).**

The CODA extension registers 10 `coda_*` tools that the agent CAN call, but `forge` is only exposed as a `/coda` subcommand via `registerCommand`. Slash commands are by design human-only in Pi.

### Additional bug found:

**`coda_create` before forge breaks forge.** If the agent calls `coda_create` before forge runs, it creates `.coda/issues/` which makes forge's `detectBackdrop` think the project is already initialized, skipping the scaffold.

## Corrected Execution Model

The Script A flow must be:

1. **Outer agent (this session)** runs `/coda forge` — this is a human/PM action
2. **Outer agent** configures gates to auto in `coda.json`
3. **Inner agent** uses `coda_*` tools for the lifecycle (SPECIFY → PLAN → BUILD → VERIFY → UNIFY → DONE)

The original script assumed the inner agent would discover and run `/coda forge`. That's architecturally impossible.

## Test Project State

- `~/pi/workspace/coda-test-shortener` exists but is contaminated from session 2
- Needs full nuke and recreate before session 3
- `.pi/settings.json` disables megapowers (must be preserved)

## What's Next

**Immediate:**
1. `rm -rf ~/pi/workspace/coda-test-shortener` and recreate bare project
2. Copy `.pi/settings.json` back (megapowers disabled)
3. Start new CMUX pane
4. **Outer agent types `/coda forge`** in the Pi session
5. Outer agent sets gates to auto in `.coda/coda.json`
6. Send natural prompts for SPECIFY → lifecycle

**After completion:**
- Write findings report to `docs/v0.8/E2E-COMPOUNDING-FINDINGS.md`
- Run `/paul:unify` for Phase 52

## Key Files

| File | Purpose |
|------|---------|
| `.paul/STATE.md` | Official project state |
| `.paul/phases/52-greenfield-compounding-test/52-01-PLAN.md` | Phase 52 plan (needs amendment for forge-is-slash-command) |
| `/Users/maxwellnewman/pi/workspace/thinkingSpace/explorations/cmux-v08-test-scripts.md` | Script A source |
| `~/pi/workspace/coda-test-shortener/.pi/settings.json` | Megapowers disabled config (preserve!) |

## Findings Already Captured (for report)

| # | Finding | Severity | Category |
|---|---------|----------|----------|
| F1 | `/coda forge` not agent-callable — slash command, not tool | Critical | Architecture |
| F2 | `coda_create` before forge breaks forge detection | High | Bug |
| F3 | Agent reads CODA source code instead of following prompts | High | Prompt quality |
| F4 | Agent doesn't understand Pi slash commands at all | Medium | Agent UX |
| F5 | Write gate correctly blocks direct `.coda/` writes | ✅ Pass | Security |
| F6 | Agent discovers and uses `coda_*` tools correctly | ✅ Pass | Tool discovery |
| F7 | megapowers extension interferes with CODA testing | Medium | Test environment |

---

*Handoff updated: 2026-04-15 21:30 EDT*
