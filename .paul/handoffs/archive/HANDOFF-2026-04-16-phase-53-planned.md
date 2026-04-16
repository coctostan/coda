# PAUL Handoff

**Date:** 2026-04-16
**Status:** paused (Phase 53 plan approved, ready for APPLY)

---

## READ THIS FIRST

You have no prior context. This document tells you everything.

**Project:** coda-ecosystem
**Core value:** Enabling developers to build durable, maintainable software through disciplined agent-assisted workflows — bridging vibe-coding speed and production-quality outcomes.

---

## Current State

**Version:** v0.10.0-dev
**Milestone:** v0.10 Close the Agent Loop ("the compounding engine actually compounds")
**Phase:** 53 of 57 — Agent Entry Points
**Plan:** 53-01 — created, committed, pushed; awaiting APPLY

**Loop Position:**

```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ○        ○     [Plan approved, ready for APPLY]
```

## Git State

| Field | Value |
|-------|-------|
| Branch | `phases/53-agent-entry-points` (fresh from main, pushed) |
| Base | `main` |
| PR | none yet — will open on first APPLY commit |
| CI | N/A (no PR) |
| Ahead of base | 5 commits (all chore/plan work) |
| Behind base | 0 |
| Working tree | clean |
| Last commit | `070734c` — plan: phase 53 — Agent Entry Points (tdd) |

---

## What Was Done This Session

This session ran long and did several distinct pieces of work. Summary in order:

### 1. Resume from v0.10 kickoff handoff
- Loaded STATE.md + HANDOFF-2026-04-16-v0.10-kickoff.md
- Git-aware routing flagged branch as 1 behind / 18 ahead — initially suggested a rebase.

### 2. Root-cause investigation on "why are we 1 behind / 18 ahead on a long-lived branch"
- Discovered PR #19 squash-merged April 14 as `3ad8c26` on main.
- Branch `phases/48-50-compounding-engine` was **never reset** after that merge.
- PR #20 opened on the SAME branch 13 minutes later, accumulating 18 commits across v0.8 close + v0.9 full lifecycle + v0.10 kickoff.
- Root cause: `require_pr_before_next_phase: false` in `pals.json` + no branch-reset discipline after squash-merge.
- Nothing lost — local == origin, all commits on remote in PR #20.

### 3. Omnibus cleanup (Option A — "stop the bleeding")
- Safety backup ref created (`backup/pr-20-pre-rebase-20260416`).
- Stashed dirty `.pi/prompt-assembler/registry.json`.
- Rebased onto main — duplicate `c3daac4` auto-dropped by git (patch already applied via PR #19's squash).
- Force-pushed with `--force-with-lease` (0 behind / 17 ahead after dedup).
- Relabeled PR #20 title/body to reflect actual scope.
- Waited for Socket Security CI to re-run (all GREEN).
- `gh pr merge 20 --squash --delete-branch` → merged as `9611ff0` on main, remote branch deleted.
- Pulled main, cut fresh `phases/53-agent-entry-points` from main.
- Popped registry.json stash back.

### 4. Guardrail flip
- `pals.json`: `require_pr_before_next_phase` `false` → `true`. Now every phase gets its own PR.
- Committed as `781be30 chore(pals): enforce per-phase PRs`.

### 5. `.paul/` lifecycle cleanup
- Updated STATE.md git state to the new branch; cleared resume-file pointer.
- Archived 4 stale handoffs (HANDOFF-2026-04-14-*.md, HANDOFF-2026-04-15.md, HANDOFF-2026-04-16-v0.10-kickoff.md) to `.paul/handoffs/archive/`.
- Commits `30d065f` and `66bebe2`.

### 6. `.pi/prompt-assembler/registry.json` untracked
- Determined to be per-machine state (Pi's prompt-assembler tool registry — changes with local tool set).
- Added to `.gitignore`, `git rm --cached`, committed as `3861f0f`.
- Local file preserved.
- Backup safety ref `backup/pr-20-pre-rebase-20260416` deleted after user confirmed.

### 7. Phase 53 planning (/skill:paul-plan at HIGH collab)
- Loaded: PROJECT.md, v0.10.0-ROADMAP.md (milestone vision), E2E-COMPOUNDING-FINDINGS.md, PRD.md sampled, modules.yaml, current tool/hook/slash-command implementations.
- Pre-plan dispatch (both advisory + enforcement):
  - DEAN → 0 critical / 2 high; baseline `.paul/dean-baseline.json` matches exactly → PASS
  - SETH / ARCH / IRIS → PASS
  - TODD → tdd_candidates registered
  - DOCS → README.md has no coda_* mentions; defer to milestone close
  - RUBY → flagged for post-unify complexity check (slash-cmd refactor)
- **Key reframing: F7 root cause diagnosis.** `checkWriteGate` + `evaluateWriteGate` already block both `'write'` and `'edit'` operations for `.coda/` paths; unit + integration tests confirm. The regression in Session 3 must be in the Pi-hook perimeter, not the gate logic:
  - Pi may expose mutation tools under names not caught by our `isToolCallEventType('write'|'edit')` checks (e.g., `str_replace`, `apply_patch`, `multi_edit`).
  - So Phase 53's write-gate task is **audit + diagnostic + integration test**, not "build new feature." Deeper hardening (symlink resolution, bash-redirect edge cases) is deferred to Phase 55.
- Posture negotiated with user: HIGH collab, direct-requirements.
- Open design question resolved: `coda_focus` keeps VCS branch creation (Option C — opt-out via `create_branch: false`).
- Surfaced A1–A5 assumptions, 3 rejected alternatives, 8 edge cases, 4 risks — user replied "Agree with all."
- User asked "Are you using TDD?" — confirmed yes (AGENTS.md project convention), then drafted plan with explicit red→green sub-steps.
- TODD's post-plan hook suggested upgrading `type: execute` → `type: tdd` for formal phase-gated discipline. User said "Do what todd says."
- Plan rewritten with 3 formal TDD cycles, 9 phase gates total.
- Committed as `070734c plan: phase 53 — Agent Entry Points (tdd)`, pushed to origin.

---

## What's In Progress

**Nothing in progress.** Working tree clean, all artifacts committed and pushed.

---

## What's Next

**Immediate:** Run `/paul:apply .paul/phases/53-agent-entry-points/53-01-PLAN.md`

TODD's pre-apply hook will enforce RED-first ordering at each task's phase gate.

### Plan structure reminder (3 formal TDD cycles)

**Task 1 (TDD cycle 1):** issue-activation helper + `coda_focus` tool + `/coda activate` refactor
- 🔴 RED: characterization tests for /coda activate + failing tests for `focusIssue()` helper + failing tests for `coda_focus` tool
- ⛔ phase gate: verify RED is truly failing for the right reason
- 🟢 GREEN: create helper, create tool, register with Pi
- ✅ phase gate: all tests green, full suite green
- 🔧 REFACTOR: thin `/coda activate` handler to <20 lines, delegate to `focusIssue()`
- ✅ phase gate: refactor stays green

**Task 2 (TDD cycle 2):** `coda_forge` tool + `/coda forge` refactor + AC-5 bare-workspace E2E
- 🔴 RED: failing tests for coda_forge (greenfield, brownfield, already_initialized, project_root option)
- 🟢 GREEN: create tool using detectBackdrop + scaffoldCoda + assembleScanContext; register with Pi
- 🔧 REFACTOR: thin /coda forge handler + add bare-workspace-lifecycle.test.ts (forge → create → focus, no slash commands)

**Task 3 (TDD cycle 3):** Pi mutation-tool-surface audit + F7 regression integration test + DEBUG=coda:* logging
- 🔍 AUDIT (pre-RED): enumerate all mutating tool names Pi exposes (grep node_modules/@mariozechner/pi-coding-agent/dist/*.d.ts)
- 🔴 RED: write-gate-integration.test.ts simulating real Pi tool_call dispatch for each mutation tool; DEBUG diagnostic test
- 🟢 GREEN: extend hooks.ts interception for any new tool types; add diagnostic logging gated by DEBUG=coda:*
- 🔧 REFACTOR: tighten audit comment; maybe extract interception list to named constant

### After Phase 53 (sequence)

- Phase 54: UNIFY Actually Produces Artifacts (F5 — the headline fix)
- Phase 55: Supporting Systems Repair (F6 + deeper write-gate hardening + remove `human_review_default`)
- Phase 56: Lifecycle-First Prompts (F3, F4)
- Phase 57: E2E Re-Validation (rerun Script A, prove compounding)

---

## Key Decisions This Session

| Decision | Rationale | Logged |
|----------|-----------|--------|
| PR #20 merged as squash (omnibus) rather than split | Already-merged topology; splitting would be hours of archaeology for the same end state; config flip prevents recurrence | Commit `9611ff0` |
| `require_pr_before_next_phase: true` | Every phase gets its own PR going forward; prevents multi-milestone omnibus PRs | Commit `781be30` |
| `.pi/prompt-assembler/registry.json` gitignored | Per-machine state, not shared project config | Commit `3861f0f` |
| `coda_focus` Option C (keep branch creation, opt-out via `create_branch: false`) | Single-call agent ergonomics with escape hatch for non-git contexts; matches existing `/coda activate` behavior | STATE.md decisions |
| F7 root cause = integration gap, not logic bug | `checkWriteGate` blocks `.coda/` edits in unit tests; regression must be in Pi-hook perimeter | STATE.md decisions |
| Write-gate deeper hardening deferred to Phase 55 | Phase 53 scope stays tight: audit + regression test + diagnostic; Phase 55 handles new attack patterns | Plan boundaries |
| Plan type `tdd` with formal phase gates (not `execute` with embedded TDD) | TODD post-plan suggestion accepted; procedural + observable enforcement of red-first discipline | Plan frontmatter + commit `070734c` |

---

## Key Files

| File | Purpose |
|------|---------|
| `.paul/STATE.md` | Live project state — Phase 53 planning complete |
| `.paul/ROADMAP.md` | Current roadmap; Phase 53 marked "Plan created, awaiting APPLY" |
| `.paul/phases/53-agent-entry-points/53-01-PLAN.md` | **THE plan to apply** — 492 lines, 3 TDD cycles, 6 AC |
| `.paul/milestones/v0.10.0-ROADMAP.md` | v0.10 milestone vision (unchanged from kickoff) |
| `docs/v0.8/E2E-COMPOUNDING-FINDINGS.md` | The 8 findings driving v0.10 — F1/F2/F7 are Phase 53's scope |
| `pals.json` | `require_pr_before_next_phase: true` now enforced |
| `packages/coda/src/pi/hooks.ts` | Where F7 audit/diagnostic lands (Task 3) |
| `packages/coda/src/pi/commands.ts` | `/coda forge` (case 'forge') and `/coda activate` (case 'activate') handlers — targets of Task 1 + 2 refactor |
| `packages/coda/src/pi/tools.ts` | Where `coda_forge` + `coda_focus` get registered |
| `packages/coda/src/tools/write-gate.ts` | Pure-function gate — DO NOT CHANGE in Phase 53 |
| `packages/coda/src/forge/scaffold.ts` | `detectBackdrop`, `scaffoldCoda` — reused as building blocks |
| `packages/coda/src/forge/brownfield.ts` | `assembleScanContext` — reused |
| `packages/coda/src/workflow/vcs.ts` | `createBranch` — reused |
| `.paul/dean-baseline.json` | Baseline acknowledged — 2 high basic-ftp vulns; no new deltas |

---

## Resume Instructions

1. Read `.paul/STATE.md` for the latest position.
2. Run `/paul:resume` — it will detect this handoff and archive it after you proceed.
3. When ready, run `/paul:apply .paul/phases/53-agent-entry-points/53-01-PLAN.md`.
4. TODD's pre-apply hook will verify RED tests exist first; if they don't, it blocks.

### Context hints for the implementer

- **TDD discipline is not optional here.** Plan type `tdd` + TODD's pre-apply hook + project convention in AGENTS.md all require red-first. Phase gates are explicit.
- **Slash-command string messages are pinned by tests** in `packages/coda/src/pi/__tests__/commands.test.ts` (667 lines). When refactoring `/coda forge` and `/coda activate`, byte-identical user-visible output is required.
- **F7 audit is pre-RED for Task 3** because the audit output determines what the regression test asserts. Don't write the regression test until the audit records Pi's current mutation tool surface in a comment block at the top of `hooks.ts`.
- **AC-5 (bare-workspace E2E) lands in Task 2's REFACTOR phase**, not as a separate task — the test exercises all three tools (`coda_forge` → `coda_create` → `coda_focus`) so it can only land once both new tools exist.
- **Do NOT touch `.pi/prompt-assembler/` anything** — now gitignored as per-machine state.

### Guardrails to check before APPLY

- `bun test` is currently green (655 tests) — verify before starting, because any pre-existing failure would confuse TDD red detection.
- `bun run --filter '*' typecheck` (or `tsc --noEmit` package-by-package) is currently clean.
- No uncommitted changes in the working tree.
- On branch `phases/53-agent-entry-points`.

---

## PR Status

No PR yet. Branch `phases/53-agent-entry-points` has been pushed (upstream set). Per the project's flipped `require_pr_before_next_phase: true`, a PR should open at or shortly after the first APPLY commit. Recommend:
- Open PR early (after Task 1 GREEN) so CI starts running
- Title: `feat(53-agent-entry-points): add coda_forge + coda_focus tools; F7 write-gate regression guard`
- Squash-merge at phase UNIFY.

---

*Handoff created: 2026-04-16*
