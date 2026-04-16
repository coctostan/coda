# PAUL Handoff

**Date:** 2026-04-16
**Status:** paused (Phase 54 plan approved, ready for APPLY)

---

## READ THIS FIRST

You have no prior context. This document tells you everything.

**Project:** coda-ecosystem
**Core value:** Enabling developers to build durable, maintainable software through disciplined agent-assisted workflows — bridging vibe-coding speed and production-quality outcomes.

---

## Current State

**Version:** v0.10.0-dev
**Milestone:** v0.10 Close the Agent Loop ("the compounding engine actually compounds")
**Phase:** 54 of 57 — UNIFY Actually Produces Artifacts (F5, the headline fix)
**Plan:** 54-01 — created, committed, pushed; awaiting APPLY

**Loop Position:**

```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ○        ○     [Plan approved, ready for APPLY]
```

## Git State

| Field | Value |
|-------|-------|
| Branch | `phases/54-unify-produces-artifacts` (cut fresh from main, pushed) |
| Base | `main` |
| PR | none yet — will open on first APPLY commit |
| CI | N/A (no PR) |
| Ahead of base | 2 commits (plan + state bookkeeping) |
| Behind base | 0 |
| Working tree | clean |
| Last commit | `61ff2d7` — state: phase 54 planning → plan 54-01 awaiting APPLY |
| Plan commit | `273f2e3` — plan: phase 54 — UNIFY Actually Produces Artifacts (tdd) |

---

## What Was Done This Session

### 1. Resumed cleanly from Phase 53 completion
- Phase 53 (Agent Entry Points) had merged to main the prior session as PR #21 (squash `65a9df7`); branch deleted.
- STATE.md already said "Ready to plan Phase 54" — no handoff needed to load, STATE.md was authoritative.

### 2. Planning posture probe (high collab + exploratory)
- User requested deeper exploration before plan drafting, not the default medium/direct-requirements.
- I surfaced 7 design questions (Q1–Q7) with 2–4 options each and my lean for each.
- User replied "I like all of your rec's, let's go" — locking in:
  - **Q1=C (Hybrid evidence):** agent self-reports `artifacts_produced` paths + gate verifies existence and non-emptiness on disk.
  - **Q2=A (Single-prompt):** keep the monolithic UNIFY prompt; add evidence requirement inline. Per-action dispatcher held as Phase 55/56 fallback per milestone risk register.
  - **Q3=C (Ceremony + opt-out):** `getCeremonyRules` relaxes for refactor/chore/docs; explicit `exemptions.overlays/reference_docs/system_spec` with non-empty reason strings always allowed as escape hatch.
  - **Q4=C (Spec-delta mandatory when present):** if `issue.frontmatter.spec_delta` is declared, ref-system.md must be updated OR `exemptions.system_spec` declared — enforced across all issue types.
  - **Q5=C (No migration):** gates only fire at transition time; past-DONE completion records are never re-gated.
  - **Q6=C (Schema in prompt):** YAML schema inline at ACTION 5 + dedicated "Before You Write the Completion Record — Collect Evidence" block earlier in prompt.
  - **Q7=C (3 tasks):** core schema + gate → runner prompt → e2e integration test.

### 3. Pre-plan module dispatch
- `modules.yaml` loaded from `~/.pi/agent/skills/pals/modules.yaml` (kernel_version 2.0.0).
- Advisory: ARCH/SETH/TODD/IRIS/DOCS/RUBY fired. 0 blockers. RUBY flagged `coda-advance.ts` already at 645 LOC; plan capped growth at +40 LOC.
- Enforcement: DEAN PASS (2 high basic-ftp advisories match `.paul/dean-baseline.json` exactly, delta = 0).

### 4. Plan draft + self-caught layering fix
- Drafted `.paul/phases/54-unify-produces-artifacts/54-01-PLAN.md` (513 lines, `type: tdd`).
- Caught my own mistake: initial draft had the **core** gate mirroring the ceremony table from coda with a drift test. That would have been a duplication + drift smell.
- Fixed: `gatherGateData` in coda computes `artifactEvidenceRequired` and `specDeltaPresent` from ceremony, passes them to the gate as plain booleans. Gate stays dumb, ceremony stays authoritative in `packages/coda/src/workflow/ceremony.ts`, no core→coda import, no mirrored table.

### 5. Offered review menu; user picked `[4] No review needed`
- Plan locked as-is. Committed on a fresh branch, pushed to origin.

### 6. Lifecycle bookkeeping
- STATE.md: Current Position → Planning, Loop → PLAN ✓, branch + commit refs, Resume file → plan path.
- ROADMAP.md: phase 54 table row → 🟡 Planning; phase 54 detail → plan link.
- Committed as `61ff2d7` and pushed.

### 7. User paused
- Chose `[3] Pause here` when offered the APPLY continuation prompt.

---

## What's In Progress

**Nothing in progress.** Working tree clean, all artifacts committed and pushed. The plan is the complete unit of work for the next APPLY session.

---

## What's Next

**Immediate:** Run `/paul:apply .paul/phases/54-unify-produces-artifacts/54-01-PLAN.md`

TODD's pre-apply hook will enforce RED-first ordering at each of the 3 TDD cycle phase gates.

### Plan structure reminder (3 formal TDD cycles)

**Task 1 (TDD cycle 1): Evidence-based `unify→done` gate + schema extension (core)**
- 🔴 RED: 10 new gate cases in `gates.test.ts` + 4 new `gatherGateData` cases in `coda-advance.test.ts`
- ⛔ phase gate: verify RED is failing for the right reason
- 🟢 GREEN:
  - Extend `CompletionRecord` (`packages/core/src/data/types.ts`) with optional `artifacts_produced` + `exemptions`
  - Extend `GateCheckData` (`packages/core/src/state/types.ts`) with `artifactsProduced`, `artifactExemptions`, `artifactEvidenceRequired`, `specDeltaPresent`, `codaRoot`
  - Rewrite `unify→done` check in `gates.ts` with file-private `verifyArtifactEvidence(codaRoot, paths, kind)` helper — inline minimal overlay parse in core, no coda import
  - Update `gatherGateData` in `coda-advance.ts` to call `getCeremonyRules` and set the two booleans; read `artifacts_produced` + `exemptions` from completion record frontmatter
- ✅ phase gate: all tests green, full suite green
- 🔧 REFACTOR: extract helpers; keep `coda-advance.ts` growth ≤ +40 LOC from 645 baseline
- ✅ phase gate: refactor stays green

**Task 2 (TDD cycle 2): UNIFY runner prompt restructure (ceremony-aware) (coda)**
- 🔴 RED: new test cases in `unify-runner.test.ts` for feature / refactor / chore prompts; revision prompt must NOT duplicate artifacts_produced instructions
- 🟢 GREEN:
  - `assembleUnifyContext` reads `issue.frontmatter.issue_type`, calls `getCeremonyRules`, passes to `buildUnifySystemPrompt`
  - `buildUnifySystemPrompt(specDelta, hasMilestone, ceremony, issueType)` emits inline YAML `artifacts_produced:` schema + "Before You Write the Completion Record — Collect Evidence" block + ceremony-aware wording ("strict" for feature/bugfix, "relaxed" for refactor/chore/docs)
  - If `specDelta` present: add explicit "spec_delta declared — you MUST update ref-system.md OR declare exemptions.system_spec" line
  - Revision prompt (`buildUnifyRevisionPrompt`) unchanged
- 🔧 REFACTOR: extract `buildEvidenceBlock` + `ARTIFACTS_SCHEMA_BLOCK` constant

**Task 3 (TDD cycle 3): End-to-end UNIFY-produces-artifacts integration test (coda)**
- 🔴 RED: new file `packages/coda/src/workflow/__tests__/unify-artifacts-e2e.test.ts` with 10 cases (feature block/pass variants, exemption variants, refactor ceremony relaxation, spec_delta survival)
  - Uses `mktempSync` tmp dir fixture (pattern from `bare-workspace-lifecycle.test.ts`)
  - Each case materializes `.coda/` tree on disk, calls real `codaAdvance({target_phase: 'done'})`, asserts on result
- 🟢 GREEN: no new production code expected — Tasks 1+2 should make these pass. Any integration gap = minimal fix + deviation logged for UNIFY.
- 🔧 REFACTOR: extract `buildFixture({ issueType, specDelta, artifactsProduced, exemptions, onDisk })` helper

### After Phase 54 (sequence)
- Phase 55: Supporting Systems Repair (`coda_run_tests` Bun fix, deeper write-gate hardening from F7, remove `human_review_default`)
- Phase 56: Lifecycle-First Prompts (F3, F4 — lifecycle guidance strengthened in session-start prompt)
- Phase 57: E2E Re-Validation (rerun Script A, prove compounding actually compounds — the evidence gate from this phase makes `unify→done` blockable end-to-end)

---

## Key Decisions This Session

| Decision | Rationale | Logged |
|----------|-----------|--------|
| Evidence mechanism = hybrid (self-report + disk check) | Q1=C. Declarative agent accountability + machine verification. Simpler than filesystem-scan-at-gate (which needs durable issue-start timestamps) and less over-engineered than git-snapshot. | Plan, STATE.md decisions will carry after APPLY |
| UNIFY runner stays single-prompt | Q2=A. Per-action dispatcher is the milestone's explicit fallback if Phase 57 E2E proves the evidence gate insufficient; don't blow scope pre-emptively. | Plan boundaries + milestone §Risks cross-ref |
| Ceremony relaxation + explicit opt-out both allowed | Q3=C. Ceremony is the default filter; `exemptions.*` with non-empty reason is the escape hatch. Too-frequent opt-outs become audit signal. | Plan AC-3, AC-4 |
| `spec_delta` enforcement survives ceremony | Q4=C. If an issue declared a spec delta, UNIFY must land it regardless of issue type. Strongest compounding signal. | Plan AC-4 second gherkin |
| No migration for pre-Phase-54 completion records | Q5=C. Gates only fire at transition time; past-DONE issues never re-enter UNIFY. Cleanest. | Plan boundaries |
| Ceremony booleans computed in coda, not mirrored into core | Self-caught during drafting. Layering rule forbids core→coda import; mirroring the table would create duplication + drift. `gatherGateData` owns the translation. | Plan Task 1 §3 rationale block |
| Quality cap: `coda-advance.ts` ≤ +40 LOC net | RUBY advisory flagged existing 645 LOC already over soft 500-line threshold. Plan AC-6 enforces structural budget. | Plan AC-6, Task 1C phase gate |

---

## Module Dispatch (pre-plan, for the APPLY session's reference)

| Hook | Module(pri) | Result |
|------|-------------|--------|
| pre-plan advisory | ARCH(75) | arch_context: pattern=layered-monorepo, imports stay core←coda, no god-file growth (unify-runner.ts 274L, gates.ts 115L) |
| pre-plan advisory | SETH(80) | sec_warnings=0 — no secrets, no auth surfaces; path checks scoped to codaRoot + reference/ |
| pre-plan advisory | TODD(100) | tdd_candidates = {gate-evidence-check, gatherGateData-wiring, unify-prompt-schema, unify-artifacts-e2e}; type=red→green |
| pre-plan advisory | IRIS(150) | review_flags=0; no TODO/FIXME/HACK markers in scope |
| pre-plan advisory | DOCS(200) | doc_warnings={`docs/coda-spec-v7.md` should document new schema — deferred to milestone close per Phase 53 convention} |
| pre-plan advisory | RUBY(250) | debt_flags={`coda-advance.ts` 645L already over soft 500-line threshold — plan caps growth ≤+40 LOC} |
| pre-plan enforcement | DEAN(50) | PASS — 2 high basic-ftp advisories (IDs 1116454, 1116478) match `.paul/dean-baseline.json` exactly; delta = 0 |
| skipped (no applicable files) | ARIA, LUKE, DANA, GABE, PETE, REED, VERA, CODI, OMAR, DAVE | — |

APPLY will re-dispatch pre-apply (TODD), post-task (TODD × 3), post-apply advisory (IRIS/DOCS/SKIP), post-apply enforcement (ARCH/SETH/DEAN/VERA/WALT/TODD), and post-unify (WALT/SKIP/RUBY) per the standard module matrix.

---

## Key Files

| File | Purpose |
|------|---------|
| `.paul/STATE.md` | Live project state — authoritative |
| `.paul/ROADMAP.md` | Phase overview; phase 54 now 🟡 Planning |
| `.paul/phases/54-unify-produces-artifacts/54-01-PLAN.md` | THE PLAN — 513 lines, 3 TDD cycles, 10 gate cases, 10 e2e cases |
| `.paul/milestones/v0.10.0-ROADMAP.md` | v0.10 milestone vision — Phase 54 detail §"UNIFY Actually Produces Artifacts" is the source of truth for scope |
| `docs/v0.8/E2E-COMPOUNDING-FINDINGS.md` | §F5 — the finding this phase addresses |
| `packages/core/src/data/types.ts` | Will gain `CompletionRecord.artifacts_produced` + `exemptions` |
| `packages/core/src/state/types.ts` | Will gain `GateCheckData` fields: artifactsProduced, artifactExemptions, artifactEvidenceRequired, specDeltaPresent, codaRoot |
| `packages/core/src/state/gates.ts` | `unify→done` gate — evidence validation added after existing boolean checks |
| `packages/coda/src/tools/coda-advance.ts` | `gatherGateData` — ceremony booleans + artifact/exemption read wiring |
| `packages/coda/src/workflow/unify-runner.ts` | `buildUnifySystemPrompt` restructure |
| `packages/coda/src/workflow/ceremony.ts` | Read-only consumer via `getCeremonyRules` |
| `packages/core/src/modules/overlay.ts` | Read-only reference for overlay section format (gate inlines minimal parse to avoid core→coda-ish cycle — still pure core, just pattern mirror) |

---

## Resume Instructions

1. Run `/paul:resume` — STATE.md will route to `/paul:apply .paul/phases/54-unify-produces-artifacts/54-01-PLAN.md`.
2. Or read this handoff + `.paul/STATE.md` and run APPLY directly.
3. Branch `phases/54-unify-produces-artifacts` is already cut from main, pushed to origin, and clean. No rebase needed — `require_pr_before_next_phase: true` will open the PR on the first APPLY commit.

---

*Handoff created: 2026-04-16 (plan committed as `273f2e3`, state bookkeeping as `61ff2d7`, both pushed).*
