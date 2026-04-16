---
phase: 54-unify-produces-artifacts
plan: 01
completed: 2026-04-16T00:00:00Z
duration: ~1 session
type: tdd
---

## Objective

Make the `unify→done` gate **evidence-based** instead of self-assertion-based, so UNIFY cannot complete unless at least one overlay or reference-doc update was actually produced on disk (or an explicit exemption was declared). Restructure the UNIFY runner prompt so the agent is told exactly which paths to list as evidence, with ceremony-aware relaxation for `refactor`/`chore`/`docs` issues.

F5 (the headline v0.8 live-test finding) fixed: UNIFY can no longer advance to DONE by asserting `system_spec_updated: true` with zero corresponding artifacts on disk.

## What Was Built

| File | Purpose | Lines Changed |
|------|---------|---------------|
| `packages/core/src/data/types.ts` | `CompletionRecord` gains `artifacts_produced` + `exemptions` optional fields | +20 |
| `packages/core/src/state/types.ts` | `GateCheckData` gains `artifactsProduced`, `artifactExemptions`, `specDeltaPresent`, `artifactEvidenceRequired`, `codaRoot` | +35 |
| `packages/core/src/state/gates.ts` | `unify→done` gate runs evidence validation after boolean/review checks; inlines a minimal overlay parser (layering-clean) | +155 |
| `packages/core/src/state/__tests__/gates.test.ts` | 12 new cases under `describe('unify→done evidence gate', …)` | +184 |
| `packages/coda/src/tools/coda-advance.ts` | `gatherGateData` reads `artifacts_produced`/`exemptions` from completion record; computes `artifactEvidenceRequired`/`specDeltaPresent` from `getCeremonyRules(issueType)` | +36 |
| `packages/coda/src/tools/__tests__/coda-advance.test.ts` | 5 new cases covering gate-data population | +162 |
| `packages/coda/src/workflow/unify-runner.ts` | `buildUnifySystemPrompt` accepts `ceremony`/`issueType`; adds `buildEvidenceBlock` + `ARTIFACTS_SCHEMA_BLOCK`; ceremony-aware strict/relaxed language | +49 net (274→323) |
| `packages/coda/src/workflow/__tests__/unify-runner.test.ts` | 8 new cases covering prompt structure + revision-path guard | +142 |
| `packages/coda/src/workflow/__tests__/unify-artifacts-e2e.test.ts` | **NEW** — 10-case integration test exercising the full `codaAdvance({target_phase: 'done'})` pipeline | +314 (new file) |
| `packages/coda/src/tools/__tests__/gate-automation-integration.test.ts` | Pre-existing fixture updated to declare `exemptions` | +4 |
| `packages/coda/src/workflow/__tests__/v08-e2e.test.ts` | Pre-existing fixture updated to declare `exemptions` | +4 |
| `packages/coda/src/workflow/__tests__/autonomous-loops-e2e.test.ts` | Pre-existing fixtures updated to declare `exemptions` | +8 |

**Production source LOC growth:**
- `coda-advance.ts`: 645 → 681 (+36 lines, within plan's RUBY ceiling of +40 ✅)
- `gates.ts`: 114 → 267 (+153 lines, all evidence infrastructure)
- `unify-runner.ts`: 274 → 323 (+49 lines)

## Acceptance Criteria Results

| AC | Description | Status | Evidence |
|----|-------------|--------|----------|
| AC-1 | `unify→done` blocks feature/bugfix with empty evidence + no exemption | ✅ PASS | `gates.test.ts` cases 1–2; `unify-artifacts-e2e.test.ts` case 1 |
| AC-2 | Passes when declared artifact paths exist on disk and are non-empty | ✅ PASS | `gates.test.ts` cases 5–6; `unify-artifacts-e2e.test.ts` cases 2–3 |
| AC-3 | Passes with explicit exemption reason; empty string rejected | ✅ PASS | `gates.test.ts` cases 7–8; `unify-artifacts-e2e.test.ts` cases 6–7 |
| AC-4 | Relaxes evidence for `refactor`/`chore`/`docs`; still enforces spec_delta | ✅ PASS | `gates.test.ts` cases 9–12; `unify-artifacts-e2e.test.ts` cases 8–10 |
| AC-5 | UNIFY prompt carries `artifacts_produced` schema + ceremony-aware exemption guidance | ✅ PASS | `unify-runner.test.ts` `UNIFY prompt artifacts_produced schema` describe block (8 cases) |
| AC-6 | Quality bar holds: full suite green, no new `any`, no TODO/FIXME in source, `bun audit` delta 0, coda-advance.ts growth ≤ 40 | ✅ PASS | `bun test` 708 pass / 0 fail; `grep any/TODO` 0 hits in production files; `bun audit` delta 0; wc -l +36 |

All 6 acceptance criteria satisfied.

## Verification Results

```bash
$ bun test
 708 pass
 0 fail
 2092 expect() calls
Ran 708 tests across 55 files. [2.47s]

$ bun test packages/core/src/state/__tests__/gates.test.ts \
           packages/coda/src/tools/__tests__/coda-advance.test.ts \
           packages/coda/src/workflow/__tests__/unify-runner.test.ts \
           packages/coda/src/workflow/__tests__/unify-artifacts-e2e.test.ts
 98 pass
 0 fail
 218 expect() calls
Ran 98 tests across 4 files.

$ wc -l packages/coda/src/tools/coda-advance.ts
     681 packages/coda/src/tools/coda-advance.ts      # 645 → 681, +36 (ceiling +40)

$ bun audit --json
# 2 high basic-ftp advisories (1116454, 1116478) — unchanged vs baseline
```

Baseline: 673 pass → 708 pass (+35 new tests, 0 regressions). All targeted and full-suite runs green.

## Deviations

### D1 — Three pre-existing integration-test fixtures expanded to declare `exemptions` (scope expansion, not scope drift)

**What:** `gate-automation-integration.test.ts`, `v08-e2e.test.ts`, and `autonomous-loops-e2e.test.ts` each had a feature-issue completion record with empty `artifacts_produced` and no exemptions. Under the new evidence gate, those fixtures correctly started failing with "no compounding artifacts produced" — the exact behavior this phase ships.

**Why it happened:** The plan's `files_modified` list enumerated only the files where new logic/tests would land, not fixture backfill in adjacent test files. When the gate went live, those fixtures surfaced as collateral. The alternative (downgrading the evidence check) would defeat the phase's purpose.

**Impact:** +16 lines across 3 test files, zero production code weakening. Each fixture now carries `exemptions: { overlays: '...', reference_docs: '...' }` stubs that are explicitly labeled as fixture-only rationale strings.

**Pattern for future phases:** When a plan ships a new gate rule that applies globally, pre-walk all fixtures exercising the old gate before APPLY to anticipate backfill. A simple `grep -r 'completion_at' packages/*/src/**/__tests__` would have surfaced all 6 call sites during PLAN.

### D2 — Inline overlay-parser in gates.ts rather than importing from `core/src/modules/overlay.ts`

**What:** `gates.ts` now contains a minimal (~30 lines) overlay heading/bullet parser — a subset of the logic in `core/src/modules/overlay.ts` (`parseOverlaySections`).

**Why it happened:** `gates.ts` is L2 (state) and `overlay.ts` is L3 (modules). L2→L3 would be a layering violation. Options considered:
- Move the parser into L2 (rejected: overlay parsing is a modules concern; spreading it into state bloats scope and risks ownership drift).
- Invert: make gates call out to an injected function (rejected: gate signature pollution for a single use site).
- Inline the minimal subset needed (chosen: duplication is small, the format is dead-simple, and the plan explicitly approved this trade-off: "If this duplicates too much logic, accept a small duplication rather than a layering violation.").

**Impact:** If overlay section headings change in the future (unlikely — they're in the spec), both parsers would need updating. Mitigated by the fact that the headings live in a single spec doc and both parsers are tested directly.

## Key Patterns / Decisions

### Decision DEC-54-1 — Evidence mechanism: hybrid self-report + disk verification

- **Context:** Agent self-asserted booleans (`system_spec_updated: true`) were being declared without any corresponding artifacts on disk. Needed a mechanism that doesn't second-guess the agent's intent but does verify real-world outcomes.
- **Decision:** `artifacts_produced` is the agent's self-report of paths it claims to have written; the gate reads each path from disk to verify existence + non-emptiness. Fake paths are rejected; empty exemption strings are rejected; empty artifact lists are rejected in full-ceremony issues (feature/bugfix) unless explicitly exempted.
- **Alternatives considered:**
  - Pure disk scan (reject: no way to know which paths the agent intended).
  - Pure self-report (reject: already failed in v0.8 live test — the F5 finding).
  - External validator service (reject: over-engineering for a local-file check).
- **Rationale:** Hybrid honors the agent's reasoning while requiring material output. Gate stays dumb and data-driven; agent stays in control of which paths to report.
- **Impact:** All future `unify→done` transitions for full-ceremony issues must either produce a real overlay/ref-doc on disk or carry a concrete exemption reason.

### Decision DEC-54-2 — Ceremony knowledge stays in coda; gate stays layering-clean

- **Context:** The gate needs to know whether the issue type requires evidence, but ceremony rules live in `packages/coda/src/workflow/ceremony.ts` (L4) and the gate lives in `packages/core/src/state/gates.ts` (L2). Core can't import coda.
- **Decision:** `gatherGateData` in `coda-advance.ts` (L4) calls `getCeremonyRules(issueType)` and hands the gate two pre-computed booleans: `artifactEvidenceRequired` and `specDeltaPresent`. Gate never imports from coda; no ceremony table is mirrored into core.
- **Alternatives considered:**
  - Mirror ceremony table into core (reject: duplication + drift risk).
  - Inject a ceremony resolver function into the gate (reject: signature pollution).
- **Rationale:** Keeps the gate dumb and data-driven. Ceremony stays authoritative in its single source of truth.
- **Impact:** Any future ceremony rule changes ship in `ceremony.ts` alone; gate never needs updating.

### Decision DEC-54-3 — Spec-delta enforcement is ceremony-independent

- **Context:** Refactor issues have relaxed UNIFY ceremony (`unifyFull: false`), but a refactor that changes system behavior still needs ref-system.md updated. Should ceremony relaxation apply to spec_delta too?
- **Decision:** No. If the issue has a declared `spec_delta`, the gate enforces it regardless of ceremony. Relaxation covers empty artifacts_produced; it does not cover missing spec-delta follow-through.
- **Rationale:** Spec-delta is a stated intent on the issue. Ceremony relaxation is for whether every issue must capture patterns; spec-delta enforcement is about honoring intent already declared. These are orthogonal.
- **Impact:** A refactor issue with spec_delta declared in frontmatter must either update `reference/ref-system.md` OR declare `exemptions.system_spec`.

### Pattern P54-1 — TDD phase gates catch pre-existing fixture coupling early

During the RED phase of Task 1, 8 new test cases failed as expected. During GREEN, 3 *pre-existing* integration tests also flipped to red because their fixtures had never needed to satisfy the new rule. The phase-gate ordering (targeted tests first, then full suite) surfaced this before it shipped. Lesson: when adding a globally-applied gate rule, budget time in GREEN for adjacent-fixture backfill.

### Pattern P54-2 — Inline `require('fs')` inside test cases is a portability smell

Several existing tests used `const { mkdirSync } = require('fs');` inside describe blocks rather than top-of-file imports. This works in Bun but is a module-boundary smell. Non-blocking for this phase; flagged as a candidate for a future test-hygiene pass.

## Module Execution Reports

### Post-apply (collected during APPLY)

**Advisory (non-blocking):**
- `[dispatch] post-apply advisory: IRIS(250) → 0 annotations` — no TODO/FIXME/HACK/XXX markers in changed source files.
- `[dispatch] post-apply advisory: DOCS(250) → 1 drift warning` — `docs/coda-spec-v7.md` should document the new `artifacts_produced` schema and evidence gate. Plan explicitly deferred this to milestone close; carried here as a known follow-up.
- `[dispatch] post-apply advisory: RUBY(300) → 1 WARN` — `coda-advance.ts` 681L (still above 500L soft threshold; grew by +36 within plan's +40 ceiling). Consider extracting `gatherGateData` and `readArtifactFields` helpers in Phase 55+ if growth continues.
- `[dispatch] post-apply advisory: SKIP(300) → 2 decisions queued for UNIFY` — decisions DEC-54-1, DEC-54-2, DEC-54-3 surfaced above; pattern P54-1, P54-2 captured.

**Enforcement (blocking):**
- `[dispatch] post-apply enforcement: WALT(100) → PASS` — 708 pass / 0 fail / 2092 expect (baseline 673 → 708, +35 new, 0 regressions).
- `[dispatch] post-apply enforcement: DEAN(150) → PASS` — delta 0 vs baseline; 2 high basic-ftp advisories (1116454, 1116478) unchanged.
- `[dispatch] post-apply enforcement: TODD(200) → PASS` — full suite green; TDD phase gates all passed (RED → GREEN → REFACTOR verified at each of 3 cycles).

### Post-unify (collected during UNIFY)

**`[dispatch] post-unify: WALT(100) → 1 side_effect`**
- `.paul/quality-history.md` entry appended: `| 2026-04-16 | 54-unify-produces-artifacts | 708 pass / 0 fail | N/A | clean | N/A | ↑ improving (+35 new tests: 12 gate-evidence + 5 gatherGateData + 8 prompt schema + 10 e2e integration; F5 headline fix landed) |`

**`[dispatch] post-unify: SKIP(200) → 5 knowledge entries extracted`**
- DEC-54-1 Decision Record: Evidence mechanism = hybrid self-report + disk verification (persisted in this SUMMARY § Decisions).
- DEC-54-2 Decision Record: Ceremony knowledge stays in coda; gate stays layering-clean (persisted).
- DEC-54-3 Decision Record: Spec-delta enforcement is ceremony-independent (persisted).
- P54-1 Lesson Learned: TDD phase gates catch pre-existing fixture coupling early — actions: (1) future plans changing gate semantics should include a `fixture_audit` in `<context>`, (2) consider a post-plan TODD hook warning for gate-rule additions without fixture-dep updates.
- P54-2 Lesson Learned: Inline `require('fs')` inside test cases is a portability smell — actions: (1) open tracking note for future refactor phase to hoist `require('fs')` imports, (2) consider `no-require-imports` rule if ESLint is added later.

**`[dispatch] post-unify: RUBY(300) → 2 annotations`**
- WARN: `coda-advance.ts` 681L exceeds 500L critical threshold (grew +36 within plan's +40 ceiling). **Refactor candidate for Phase 55+:** extract `handleUnifyReviewDecision` + `handleHumanReviewDecision` into a sibling `coda-advance-review.ts`.
- NOTE: `unify-runner.ts` 323L exceeds 300 WARN threshold. Non-critical; growth tightly scoped to ceremony-aware prompt logic.
- ESLint unavailable via npx; fell back to `wc -l` + `grep` per module description.

### Module evidence validation

Modules enabled in `pals.json` — dispatch logs recorded throughout PLAN, APPLY, and UNIFY. All blocking enforcement (WALT/DEAN/TODD) returned PASS. All advisory modules emitted their findings above. Module Execution Reports section fully populated.

## Skill Audit

No `.paul/SPECIAL-FLOWS.md` present — skill audit skipped.

## Next Phase

**Immediate:** Phase 54 has a single plan (54-01). With this SUMMARY, phase 54 is complete, closing the PLAN → APPLY → UNIFY loop for the headline v0.10 F5 fix.

**Downstream impact:**
- Phase 57 (E2E re-run Script A) will now see `unify→done` block until overlays/ref-docs actually exist on disk. The headline v0.10 compounding hypothesis becomes testable end-to-end.
- `docs/coda-spec-v7.md` needs a section documenting the new `artifacts_produced` schema and exemption rules — carried forward as a milestone-close item per plan directive.
- RUBY flagged `coda-advance.ts` (681L) for possible extraction in a future phase; no action for v0.10.

**Next action:** Transition phase 54 to complete (phase 54 is the last plan), then route to phase 55 planning.
