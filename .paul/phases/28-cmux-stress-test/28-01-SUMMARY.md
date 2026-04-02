---
phase: 28-cmux-stress-test
plan: 01
completed: 2026-03-29T15:30:00Z
duration: ~45 minutes (including quota pause)
---

## Objective

Execute the E2E Real Project Test — a fully autonomous CMUX-scripted Pi session building a TODO CLI through the complete CODA lifecycle.

## What Was Built

| File | Purpose |
|------|---------|
| `docs/v0.2.2/E2E-REAL-PROJECT-FINDINGS.md` | Complete findings report |
| `~/pi/workspace/coda-test-todo/` | Built TODO CLI project (preserved for inspection) |

## Results

**8/8 phases PASS.** Full CODA lifecycle completed: forge → specify → plan → build (3 tasks, TDD) → verify (5 ACs met) → unify → done → functional verification.

The inner agent (GPT-5.4) built a working TODO CLI with:
- 3 source files (types.ts, storage.ts, cli.ts)
- 3 test files (7 tests, all passing)
- Working CLI: add, list, done, remove with JSON persistence
- Module findings persisted at runtime (security analysis during plan phase)
- TDD gate enforced test-first discipline

## Issues Found

| ID | Severity | Issue | Fix Phase |
|----|----------|-------|-----------|
| F4 | **Critical** | `scaffoldCoda()` doesn't create `state.json` — coda_advance fails on fresh projects | v0.5 |
| F2 | **High** | `coda.json` not updatable via coda_* tools — write gate blocks bash, no config tool exists | v0.5 |
| F6 | **Medium** | Build loop doesn't auto-advance between tasks — needs orchestrator nudging | v0.5 |
| F8 | **Medium** | `coda_report_findings` call not obvious to agent — UX needs improvement | v0.5 |
| F1 | **Low** | `cmux send` needs explicit `send-key Return` — test script issue | Script fix |
| F3 | **Low** | Agent-chosen filenames differ from requested (slugification) | Cosmetic |

## Positive Findings

| ID | Finding |
|----|---------|
| F5 | Module system fires at runtime — security analysis produced real findings during plan phase |
| F7 | TDD gate works — agent wrote tests first, gate enforced discipline |

## Acceptance Criteria Results

| AC | Description | Status |
|----|-------------|--------|
| AC-1 | Test infrastructure ready | ✅ PASS |
| AC-2 | Full lifecycle exercised | ✅ PASS |
| AC-3 | Findings report complete | ✅ PASS |
| AC-4 | Functional verification | ✅ PASS |

## Module Execution Reports

### APPLY Phase
- This phase was observational — no CODA source modifications, so no module dispatch needed.

### Post-Unify
- **WALT(100):** No code changes — quality baseline unchanged (386 tests)
- **SKIP(200):** No new decisions
- **RUBY(300):** skip

## Deviations

- Model switched from gpt-5.4-mini to gpt-5.4 due to OpenAI quota — environment issue, not CODA.
- state.json created manually to unblock lifecycle — documents F4 gap.
- coda.json test commands set externally — documents F2 gap.
- Agent nudged between tasks — documents F6 gap.

## Context Usage

- Inner agent: 25.1% of 272k context, ~4.1M tokens total
- Orchestrator overhead: minimal (cmux send/read-screen commands)

## Next Steps

Issues F2, F4, F6, F8 cataloged for a future fix milestone (v0.5). The CODA lifecycle works end-to-end with known rough edges.
