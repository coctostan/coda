---
phase: 58-lifecycle-bug-fixes
plan: 01
completed: 2026-04-18T00:00:00Z
duration: ~1 session (bounded APPLY on feature/57-e2e-re-validation)
---

## Objective

Fix the three concrete lifecycle bugs that blocked the Phase 57 live v0.10 re-run:
- **C1:** `coda_advance` crashed on sparse SPECIFY frontmatter.
- **C2:** `coda_edit_body` silently appended duplicate section headings on replace.
- **C3:** FORGE left `tdd_test_command` / `full_suite_command` null with no operator-facing follow-up, turning TDD into a latent configuration trap.

Phase 58 removes those blockers without widening scope into VERIFY/UNIFY integrity (Phase 59) or docs/README sweep (milestone close).

## What Was Built

| File | Purpose | Lines (after) |
|------|---------|---------------|
| `packages/coda/src/tools/coda-advance.ts` | Nil-safe `gatherGateData()` via new `normalizeIssueFrontmatter()` helper; `handleHumanReviewDecision` / `handleUnifyReviewDecision` updated to pass `create_if_missing: true` to `coda_edit_body` so their replace_section calls remain sound under the new strict contract. | 704 |
| `packages/coda/src/tools/__tests__/coda-advance.test.ts` | +2 regression tests: sparse issue frontmatter (missing ACs/open_questions/human_review) and fully-minimal frontmatter. Both assert no runtime TypeError, clean gate failure, and no state mutation. | 857 |
| `packages/core/src/data/sections.ts` | `replaceSection` rewritten as a strict, deterministic resolver. Adds `normalizeHeading()` (trim + strip trailing colons + collapse whitespace + lowercase — conservative, no fuzzy substrings) and `ReplaceSectionError` (`kind: 'not_found' \| 'ambiguous'`). Matches exact headings first, then conservative normalized; any duplication is explicit ambiguity. | 259 |
| `packages/core/src/data/__tests__/sections.test.ts` | +4 regression tests covering normalization, case-insensitivity, ambiguity, and the exact Phase 57 replay sequence (repeated replace with trivially-different heading forms). Updated the "appends section if heading not found" test to reflect the new strict contract. | 294 |
| `packages/core/src/data/index.ts` | Re-exports `normalizeHeading` and `ReplaceSectionError` so tool-layer callers (`coda_edit_body`) can discriminate errors without piercing module boundaries. | 37 |
| `packages/coda/src/tools/coda-edit-body.ts` | `replace_section` branch wrapped in try/catch on `ReplaceSectionError`. `not_found` → explicit tool error unless `create_if_missing: true` (then `appendSection`); `ambiguous` → explicit tool error. Never silently appends on bare replace. | 105 |
| `packages/coda/src/tools/__tests__/coda-edit-body.test.ts` | Updated the obsolete "replace on non-existent section appends it" test to assert the new error contract; +3 regression tests covering `create_if_missing: true` append, trivial-formatting equivalence, and ambiguity refusal after pre-corrupted duplicate headings. | 208 |
| `packages/coda/src/forge/scaffold.ts` | `getDefaultConfig(projectRoot?)` now takes an optional project root. `detectTestCommand()` seeds `'bun test'` only when Bun signals are unambiguous (`bun.lock` / `bun.lockb` alongside `package.json`, or explicit `scripts.test === 'bun test'`). Every other toolchain stays null. | 158 |
| `packages/coda/src/forge/__tests__/scaffold.test.ts` | +6 tests: Bun lockfile (text + binary), explicit `bun test` script, npm-style stays null, no `package.json` stays null, zero-arg `getDefaultConfig` stays null. | 240 |
| `packages/coda/src/tools/coda-forge.ts` | New `testCommandsMissing()` helper reads the scaffolded `coda.json`; when either command is still null, the `next_action` string for greenfield and brownfield explicitly tells the operator/agent to run `coda_config` with `tdd_test_command` / `full_suite_command` (example: `bun test`). When scaffold successfully seeded commands, the nag is omitted. | 62 |
| `packages/coda/src/tools/__tests__/coda-forge.test.ts` | +3 regression tests for the three `next_action` paths (missing → mentions `coda_config`; seeded → silent; brownfield → also mentions `coda_config`). | 148 |

## Acceptance Criteria Results

| AC | Description | Status | Evidence |
|----|-------------|--------|----------|
| AC-1 | SPECIFY → PLAN survives sparse issue frontmatter without changing gate semantics | PASS | `bun test packages/coda/src/tools/__tests__/coda-advance.test.ts` — 29 pass, 0 fail. New tests "does not crash when issue frontmatter omits acceptance_criteria" and "does not crash when issue frontmatter omits optional fields entirely" both green. Existing gate semantics preserved (ready → advance / incomplete → block). |
| AC-2 | `replace_section` no longer creates silent duplicate headings | PASS | `bun test packages/core/src/data/__tests__/sections.test.ts packages/coda/src/tools/__tests__/coda-edit-body.test.ts` — 41 pass, 0 fail. Ambiguity → typed error; missing + no `create_if_missing` → typed error; `create_if_missing: true` → explicit append; frontmatter untouched across all paths. |
| AC-3 | FORGE seeds only safe test-command defaults and otherwise gives an explicit follow-up | PASS | `bun test packages/coda/src/forge/__tests__/scaffold.test.ts packages/coda/src/tools/__tests__/coda-forge.test.ts` — 36 pass, 0 fail. Bun-signaled projects seed `bun test`; ambiguous/npm-style stay null; both greenfield and brownfield `next_action` direct to `coda_config` when unset. |
| AC-4 | Quality baseline holds and scope stays tight | PASS | Full suite `bun test` → 740 pass / 1 todo / 0 fail / 2234 expect / 55 files (pre-apply 722/2185/55). `bun audit --json` exactly matches `.paul/dean-baseline.json` (1 crit / 3 high). No TODO/FIXME/HACK/XXX in touched production files. `git diff --stat` vs DO NOT CHANGE list returns empty. No new dependencies. |

## Verification Results

- `bun test packages/coda/src/tools/__tests__/coda-advance.test.ts packages/core/src/data/__tests__/sections.test.ts packages/coda/src/tools/__tests__/coda-edit-body.test.ts packages/coda/src/forge/__tests__/scaffold.test.ts packages/coda/src/tools/__tests__/coda-forge.test.ts` — all green.
- `bun test` (full suite) — **740 pass / 1 todo / 0 fail / 2234 expect / 55 files**. Baseline was 722 / 1 / 0 / 2185 / 55.
- `bun audit --json` — `{critical: 1 (protobufjs), high: 3 (basic-ftp), moderate: 0, low: 0}`. Exact match with `.paul/dean-baseline.json`; delta 0.
- `grep -rn 'TODO\|FIXME\|HACK\|XXX'` on touched production files — no hits.
- `wc -l` on touched production files: `coda-advance.ts 704` (was 669, above 500L soft threshold; tracked), `sections.ts 259`, `coda-edit-body.ts 105`, `scaffold.ts 158`, `coda-forge.ts 62`.
- `git diff --stat` vs DO NOT CHANGE files — empty.

## Module Execution Reports

### Pre-apply baselines
- `[dispatch] pre-apply: TODD(50) → test files present, baseline recorded | WALT(100) → baseline 722p/1t/0f/2185e/55f`

### Post-task enforcement
- `[dispatch] post-task(Task 1): TODD(100) → PASS (724 pass, 0 fail)`
- `[dispatch] post-task(Task 2): TODD(100) → PASS (731 pass, 0 fail)`
- `[dispatch] post-task(Task 3): TODD(100) → PASS (740 pass, 0 fail)`

### Post-apply advisory
- `[dispatch] post-apply advisory: IRIS(250) → 0 annotations | DOCS(250) → 1 annotation (pre-existing docs-deferred backlog unchanged; docs/coda-spec-v7.md §coda_edit_body already matched the new behavior, so production drift narrowed) | RUBY(300) → 2 debt annotations (coda-advance.ts 669→704L, coda-advance.test.ts 802→857L — both above soft 500L threshold, explicitly scoped out of Phase 58 per plan boundaries) | SKIP(300) → 3 knowledge notes (strict replaceSection contract + ReplaceSectionError; normalizeIssueFrontmatter nil-safety; conservative Bun-only toolchain detection)`

### Post-apply enforcement
- `[dispatch] post-apply enforcement: WALT(100) → PASS (740p/1t/0f/2234e/55f vs baseline 722/1/0/2185/55; +18 tests, +49 expects, 0 file regression) | DEAN(150) → PASS (audit counts match .paul/dean-baseline.json exactly; delta {new_critical: 0, new_high: 0}) | TODD(200) → PASS (full regression suite green; RED→GREEN documented per task)`

### Pre-unify hooks
- `[dispatch] pre-unify: SKIP(100) → 3 knowledge candidates | WALT(150) → quality trend improving (722→740 pass, 2185→2234 expect, 0 fail at both points)`

### Post-unify hooks
- `[dispatch] post-unify: WALT(100) → quality history appended | SKIP(150) → 3 candidates logged as decisions below | RUBY(200) → 2 debt flags carried forward to v0.11 follow-ups`

## Deviations

1. **Branch-name carry-over from Phase 57.** Phase 58 committed to `feature/57-e2e-re-validation` instead of `feature/58-lifecycle-bug-fixes`. Preflight rule says "continue on current branch" when already on a non-base branch, so no new branch was created. The Phase 57 live-evidence artifacts (`.paul/phases/57-e2e-re-validation/`, `docs/v0.10/E2E-COMPOUNDING-FINDINGS-v2.md`) were never committed during Phase 57 (STATE.md: "git transition not yet run"). PR #25 deliberately excludes those uncommitted Phase 57 artifacts so the PR diff is only Phase 58 production code. Phase 57 transition/PR work still owes a follow-up commit.

2. **`coda-advance.ts` size grew 669 → 704L (+35L).** Still above the 500L RUBY soft threshold. Explicitly in scope per the plan's SCOPE LIMITS: "No broad `coda-advance.ts` or `coda-advance.test.ts` refactor to solve the existing size warning." Carried forward to v0.11 follow-ups (candidate refactor still = extract `handleUnifyReviewDecision` + `handleHumanReviewDecision` into a sibling file).

3. **`coda-advance.test.ts` size grew 802 → 857L.** Same rationale — regression coverage for AC-1 required two new tests that share the existing setup helpers. Test-side extract should follow any future production-side split.

4. **Core API surface expanded.** `@coda/core` now re-exports `normalizeHeading` and `ReplaceSectionError` in addition to `replaceSection`. This is bounded expansion: `coda-edit-body.ts` needs the error class to discriminate `not_found` vs `ambiguous`, and `normalizeHeading` is exported in case future callers want to pre-check heading matching without calling `replaceSection`. No consumer change required.

## Key Patterns / Decisions

| Decision | Rationale | Impact |
|----------|-----------|--------|
| **DEC-58-1: `replaceSection` is strict — no silent append on miss.** | Phase 57 live bug: repeated replace calls silently appended duplicate headings, corrupting SPECIFY on disk. Append-on-miss was the root cause; make the helper refuse to guess. | Callers that want append-on-miss must pass `create_if_missing: true` explicitly. Internal callers in `coda-advance.ts` updated. |
| **DEC-58-2: Heading normalization = "trim + strip trailing colon + collapse whitespace + lowercase".** | Agents occasionally write `## Requirements:`, `##  Requirements  `, or `## requirements`; these are the same section to humans. No fuzzy substring matching (e.g., `Requirements (draft)` does NOT match `Requirements`). | Conservative by design. Any future request for richer matching should be a separate spec conversation. |
| **DEC-58-3: Any duplication of equivalent headings is explicit ambiguity.** | Two `## Requirements`, or one `## Requirements` + one `## requirements`, both block replace with `ReplaceSectionError('ambiguous', …)`. The tool refuses to guess and tells the operator to deduplicate first. | Prevents silent overwrites of the "wrong" duplicate when bodies are already corrupted. |
| **DEC-58-4: `normalizeIssueFrontmatter()` conservatively defaults missing fields.** | Arrays default to `[]`, booleans/strings default "off" (readiness stays false, `issue_type` falls back to `'feature'`). Malformed readiness does not become silent success; it becomes a clean gate failure. | Contains all sparse-frontmatter handling in one small helper local to `coda-advance.ts`, per the plan's REFACTOR guidance. |
| **DEC-58-5: FORGE test-command detection is Bun-only, conservative.** | `coda_run_tests` passes patterns as positional args; only `bun test <pattern>` is known to be compatible. npm/yarn/pnpm require `-- <pattern>`, which would silently break TDD. Leave unset rather than seed an incompatible command. | Operators with other runners get an explicit `coda_config` follow-up in `next_action`; no latent breakage. |
| **DEC-58-6: `next_action` wording names the exact CODA tool to invoke.** | Reinforces the v0.10 Phase 56 pattern: every handoff names a concrete tool. Missing test commands now produce `"… Then run coda_config to set tdd_test_command and full_suite_command (e.g., \"bun test\" or your project's equivalent) before relying on TDD."` | Keeps the lifecycle entry path one-call ergonomic. |

## Next Phase

Phase 58 is the first of three v0.11 phases. Remaining milestone scope:

- **Phase 59 — Lifecycle integrity (VERIFY / UNIFY):** address C4 (VERIFY over-claimed success after failed functional check) and C5 (UNIFY did not produce overlays / completion record / phase advance) from `docs/v0.10/E2E-COMPOUNDING-FINDINGS-v2.md`. Scope is deliberately downstream of Phase 58.
- **Phase 60 — Live re-run:** re-execute Script A on the v0.11 shipped behavior and emit `docs/v0.11/E2E-COMPOUNDING-FINDINGS.md` with a binary verdict (`validated` / `still broken`).

Carried follow-ups from STATE.md remain open (not addressed in Phase 58):
- `docs/coda-spec-v7.md` legacy-field sweep + `artifacts_produced` schema refresh (milestone close).
- `README.md` drift from P56 lifecycle guidance (milestone close).
- `coda-advance.ts` 500L soft-threshold extract (v0.11 refactor candidate).
- `codaRunTests` Bun-global runtime-detection `test.todo` (requires non-Bun harness).
- Phase 57 transition/PR for the uncommitted `.paul/phases/57-e2e-re-validation/` + `docs/v0.10/E2E-COMPOUNDING-FINDINGS-v2.md` artifacts.

Immediate next action: **`/paul:plan`** to create Phase 59 lifecycle-integrity plan, branching from current merged `main`.

## Skill Audit

No `.paul/SPECIAL-FLOWS.md` configured — skill audit not applicable.
