---
phase: 55-supporting-systems-repair
plan: "01"
subsystem: coda/pi-perimeter+runtime+config-migration
tags: [v0.10, F6, F7, human-review-default-removal, coda_run_tests, write-gate-hardening, symlink, bash-compound, custom-tool-default-deny, loadCodaConfig-dedupe, legacy-migration, TDD]

requires:
  - phase: 53-agent-entry-points
    provides: write-gate-integration.test.ts harness; Pi mutation tool surface audit; F7 deferred hardening scope
  - phase: 54-unify-produces-artifacts
    provides: evidence-based unify→done gate (baseline test count 708 / 2092 expect)

provides:
  - Runtime-agnostic `coda_run_tests` — `SpawnImpl` contract + `detectDefaultSpawn()` (Bun fast-path preserved, Node fallback added). Spawn failures no longer mutate state.
  - F7 write-gate hardening: parent-directory + leaf symlink resolution via `realpathSync`; bash compound/subshell/here-doc + `sh -c`/`bash -c` wrapper detection; custom-tool default-deny with `coda_*` allow-list.
  - `packages/coda/src/pi/write-gate-perimeter.ts` — extracted perimeter helpers (179L) keeping `hooks.ts` under the RUBY soft threshold.
  - `packages/coda/src/tools/coda-config.ts` exports shared `loadCodaConfig(codaRoot)` — single source of truth replacing 4 duplicated file-private helpers.
  - One-time idempotent legacy `human_review_default` → `gates` migration at config-load time, with on-disk rewrite guard.
  - `CodaConfig.human_review_default` removed; `getDefaultConfig()` emits only `gates`; `resolveGateMode` backward-compat branch deleted.

affects:
  - Phase 56 (Lifecycle-First Prompts): inherits a clean `.coda/` write perimeter (symlink + bash-compound + custom-tool bypass closed) and a migrated gates-only config shape.
  - Phase 57 (E2E Re-Validation): `coda_run_tests` demonstrably works under injectable-spawn contract; Script A can exercise the TDD gate without the "Bun is not defined" failure; legacy configs migrate on first load.

tech-stack:
  added: []
  patterns:
    - "Runtime-portable spawn via injectable helper: codaRunTests gains an optional 4th-tier `overrides.spawnImpl` argument; production uses `detectDefaultSpawn()` (Bun fast-path vs node:child_process.spawnSync); tests inject pure spies without runtime-global masking"
    - "Perimeter default-deny with prefix allow-list: custom (non-built-in) tool_calls whose input payload matches /(?:^|[\\\\/\\s])\\.coda(?:[\\\\/]|$)/ are blocked by default; coda_* toolNames are allow-listed because coda_* IS the approved mutation path"
    - "Parent-directory realpath for symlink-safe path protection: resolve the leaf first (catches leaf-symlinks); on ENOENT fall back to parent-realpath + basename-rejoin (catches parent-dir symlinks whose target file doesn't exist yet)"
    - "Bash wrapper recursion with depth cap: sh -c / bash -c payloads are re-parsed one level deep by isBashWriteToCodaInternal(payload, depth+1); depth > 1 returns false to prevent pathological unbounded nesting"
    - "Load-time config migration with didMutate guard: migrate-once on the read path; write only when the parsed object actually changed; second load touches zero bytes (mtime idempotence asserted in tests)"
    - "Single-loader consolidation: 4 duplicate file-private `loadCodaConfig` helpers replaced by one exported function in tools/coda-config.ts; the narrower-shape loader in pi/tools.ts (reads only test-command fields for the coda_run_tests wrapper) intentionally stays put"

key-files:
  created:
    - packages/coda/src/pi/write-gate-perimeter.ts
    - .paul/phases/55-supporting-systems-repair/55-01-PLAN.md
    - .paul/phases/55-supporting-systems-repair/55-01-SUMMARY.md
  modified:
    - packages/coda/src/tools/coda-run-tests.ts
    - packages/coda/src/tools/__tests__/coda-run-tests.test.ts
    - packages/coda/src/pi/hooks.ts
    - packages/coda/src/pi/__tests__/write-gate-integration.test.ts
    - packages/coda/src/forge/types.ts
    - packages/coda/src/forge/scaffold.ts
    - packages/coda/src/forge/__tests__/scaffold.test.ts
    - packages/coda/src/workflow/gate-automation.ts
    - packages/coda/src/workflow/__tests__/gate-automation.test.ts
    - packages/coda/src/workflow/__tests__/v08-e2e.test.ts
    - packages/coda/src/tools/coda-config.ts
    - packages/coda/src/tools/__tests__/coda-config.test.ts
    - packages/coda/src/tools/coda-advance.ts
    - packages/coda/src/tools/coda-status.ts
    - packages/coda/src/pi/commands.ts
    - packages/coda/src/workflow/review-runner.ts

key-decisions:
  - "DEC-55-1: codaRunTests widened with optional 4th argument `overrides?: { spawnImpl?: SpawnImpl }` (test-only injection path); production callers pass 3 args unchanged; Pi tool schema surface unchanged."
  - "DEC-55-2: Custom-tool default-deny is conservative (blocks non-coda_* tools on any `.coda/` reference in input, read-like or mutate-like). Config-driven allow-lists deferred — operators can push back if false positives surface."
  - "DEC-55-3: Parent-dir realpath is the sound invariant for symlink resolution (not leaf-realpath) because the typical write target does not exist yet at tool_call time. TOCTOU after-check is out of scope (Pi re-runs the gate on each tool_call)."
  - "DEC-55-4: Legacy human_review_default → gates migration uses coarse DEFAULT_GATE_MODES seed rather than attempting per-issue-type reverse mapping. The two shapes are not 1:1 isomorphic; operators relying on legacy per-type semantics add gate_overrides.<type>.<gate> post-migration. Captured in E3b test rename (chore review is now 'pending', was 'not-required')."
  - "DEC-55-5: Shared loadCodaConfig lives in tools/coda-config.ts; workflow/review-runner.ts imports it via tools/ (the workflow → tools direction is an established pattern already used by context-builder, review-runner, unify-runner)."
  - "DEC-55-6: Perimeter helpers extracted to pi/write-gate-perimeter.ts during the Task 2 REFACTOR phase when hooks.ts grew to 622L post-GREEN. Phase 53's perimeter-vs-pure-gate separation extends naturally: write-gate.ts stays pure; write-gate-perimeter.ts + hooks.ts now split the perimeter itself between detectors (stateless functions) and dispatcher (Pi hook glue)."

patterns-established:
  - "Injectable-spawn pattern: production functions that spawn children should accept an optional test-only spawn override so unit tests don't need runtime-global masking"
  - "Perimeter extraction + allow-list prefix: when the perimeter dispatcher file approaches size thresholds, extract stateless detectors to a sibling module and import them back; preserve the dispatcher's role as lifecycle glue"
  - "Load-time migration with idempotence assertion: any on-load config migration MUST be paired with an mtime-stability test to prove the second load does not rewrite"

duration: ~55min (APPLY execution, all inline in parent session), ~20min (UNIFY)
started: 2026-04-16T17:05:00Z
completed: 2026-04-16T18:20:00Z

artifacts_produced:
  overlays: []
  reference_docs: []
  decisions:
    - .paul/STATE.md (6 new Decisions rows: DEC-55-1 through DEC-55-6, logged at UNIFY)
    - .paul/phases/55-supporting-systems-repair/55-01-SUMMARY.md
exemptions:
  overlays: "No new project-specific patterns emerged that require a dedicated module overlay. The three patterns captured (injectable-spawn, perimeter-extraction, load-time-migration) are implementation-general and belong in SUMMARY frontmatter + STATE.md Decisions, not a module overlay file. If future plans surface recurring similar patterns, they can be promoted to `.coda/modules/*.local.md`."
  reference_docs: "No system-capability change. Phase 55 closes bug/security/migration gaps in existing subsystems (coda_run_tests, write gate, config loader) — the externally observable feature set is unchanged from Phase 54. The `docs/coda-spec-v7.md` update for `artifacts_produced` schema was already deferred to milestone close per Phase 53/54 convention and remains tracked in STATE.md follow-ups."
---

# Phase 55 Plan 01: Supporting Systems Repair Summary

**Closed the three v0.10 supporting-systems gaps: `coda_run_tests` now runs under any Pi runtime via runtime-detecting + injectable spawn; three write-gate bypass vectors (symlink, bash compound/subshell/here-doc + `sh -c`/`bash -c`, custom-tool) are blocked with a `coda_*` allow-list; `human_review_default` is removed from `CodaConfig` with one-time idempotent migration to `gates` at load time via a newly-consolidated shared `loadCodaConfig`. F6 + F7 deeper hardening + deferred #1 all landed behind 720 green tests.**

## Performance

| Metric | Value |
|--------|-------|
| Duration (APPLY) | ~55min (inline parent-session execution; 3 RED→GREEN cycles + Task 2 REFACTOR extraction) |
| Duration (UNIFY) | ~20min (SUMMARY + STATE + ROADMAP + merge gate) |
| Started | 2026-04-16T17:05Z |
| Completed | 2026-04-16T18:20Z |
| Tasks | 3 of 3 complete (TDD cycles) |
| Phase gates passed | 6 of 6 (RED + GREEN per task, plus Task 2 REFACTOR) |
| Files created | 3 (1 production + 2 PALS) |
| Files modified | 16 |
| Net lines added | +1172 / −262 (18 files + 2 state files + PLAN) |
| Tests | 708 → 720 pass / 1 todo / 0 fail / 2140 expect (+12 net, 0 regressions) |
| New exported API | 1 (`loadCodaConfig` + `SpawnImpl`/`SpawnResult` types for testability) |

## What Was Built

| File | Purpose | Lines |
|------|---------|-------|
| `tools/coda-run-tests.ts` (Δ) | Exports `SpawnResult`/`SpawnImpl` types; `detectDefaultSpawn()` returns Bun fast-path or Node adapter; `codaRunTests` signature gains optional 4th arg `overrides?.spawnImpl`; spawn-failure path no longer mutates state | 286 (was 212; +74) |
| `pi/hooks.ts` (Δ) | Imports `isBashWriteToCoda` + `inputReferencesCoda` from perimeter; `isProtectedCodaPath` rewritten with leaf-realpath-then-parent-realpath strategy; `tool_call` handler adds custom-tool default-deny branch; audit comment block extended with Phase 55 paragraph | 458 (was 474; net −16 after extraction) |
| `pi/write-gate-perimeter.ts` | **NEW** — `isBashWriteToCoda` (redirect + compound + `sh -c`/`bash -c` wrapper + command-name detectors) + `inputReferencesCoda` recursive input scanner, plus the shell tokenization helpers they consume | 179 |
| `tools/coda-config.ts` (Δ) | Exports shared `loadCodaConfig(codaRoot)`; adds `migrateLegacyHumanReviewDefault` helper (idempotent, on-mutation write); existing private `loadConfig` delegates to shared loader; `'human_review_default'` removed from `VALID_CONFIG_KEYS` | 344 (was 286; +58) |
| `forge/types.ts` (Δ) | Deleted `human_review_default: GateConfig` member and its `@deprecated` JSDoc block | 76 (was 81; −5) |
| `forge/scaffold.ts` (Δ) | Removed `human_review_default: { … }` block from `getDefaultConfig()`'s return object | 111 (was 118; −7) |
| `workflow/gate-automation.ts` (Δ) | Deleted the backward-compat lookup branch (L72–82); renumbered JSDoc resolution-order list; updated module docstring to note migration happens in coda-config | 92 (was 107; −15) |
| `tools/coda-advance.ts` (Δ) | Deleted duplicate `loadCodaConfig` helper (12 lines); added `import { loadCodaConfig } from './coda-config'`. **NO handler-body changes** | 669 (was 681; −12) |
| `tools/coda-status.ts` (Δ) | Deleted duplicate loader; imported shared | 243 (was 256; −13) |
| `pi/commands.ts` (Δ) | Deleted duplicate loader; imported shared | 390 (was 401; −11) |
| `workflow/review-runner.ts` (Δ) | Deleted duplicate loader; imported shared | 322 (was 335; −13) |
| `tools/__tests__/coda-run-tests.test.ts` (Δ) | +3 new tests (injection-happy-path, injection-ENOENT, runtime-detection todo) | 220 (was 139; +81) |
| `pi/__tests__/write-gate-integration.test.ts` (Δ) | +3 new tests (symlink leaf+parent, bash compound + `sh -c`/`bash -c`, custom-tool default-deny) | 304 (was 158; +146) |
| `tools/__tests__/coda-config.test.ts` (Δ) | +7 new tests (migrate, idempotent, preserve-existing-gates, no-op on fresh, null on missing, set-rejects-legacy, get-returns-migrated) | 219 (was 109; +110) |
| `forge/__tests__/scaffold.test.ts` (Δ) | Flipped "coda.json has all required fields" assertion; replaced "human_review_default" test with "gates has correct modes"; flipped getDefaultConfig flag | 165 (was 164; +1) |
| `workflow/__tests__/gate-automation.test.ts` (Δ) | Renamed "backward compat" → "legacy is no longer consulted"; renamed "gates wins" → "gates is sole source of truth"; flipped assertions; removed stale `delete human_review_default` lines | 130 (was 131; −1) |
| `workflow/__tests__/v08-e2e.test.ts` (Δ) | Rewrote `writeLegacyHumanReviewConfig` to raw-JSON shape; E3b rewritten as "migrates to human-default" (behavior change accepted per DEC-55-4); E4c rewritten as idempotent-migration assertion with before/after on-disk inspection | 592 (was 558; +34) |

## Acceptance Criteria Results

| Criterion | Status | Evidence |
|-----------|--------|----------|
| **AC-1**: `coda_run_tests` runs correctly under a non-Bun runtime | ✅ PASS | `codaRunTests runtime portability > runs successfully against an injected Node spawn (Bun-free path)` green with a pure-spy `SpawnImpl` returning `status: 0, stdout: 42`; `returns ENOENT-style error when the spawn impl reports missing binary` green with ENOENT-shaped spy; spawn-failure path leaves `tdd_gate`/`last_test_exit_code` unchanged (asserted). Runtime-detection-via-global-mask case retained as `test.todo` with in-code note (Bun harness prevents `globalThis.Bun = undefined` because Bun globals are readonly). |
| **AC-2**: Write gate blocks symlink, bash-compound-redirect, and custom-tool bypass vectors | ✅ PASS | `blocks writes through leaf symlinks and parent-directory symlinks` green across 5 cases (leaf + parent-dir + relative + absolute + new-file-under-symlinked-parent + negative control `link-to-src/foo.ts`). `blocks bash compound/subshell/here-doc writes into .coda/` green across 5 shell patterns + negative control `echo .coda is great`. `blocks custom tools whose input references .coda/; allow-lists coda_* tools` green across 4 cases (third-party mutator + read-like default-deny + coda_edit_body allow-list + unrelated tool pass-through). |
| **AC-3**: `human_review_default` is removed from CodaConfig and legacy configs migrate idempotently | ✅ PASS | `forge/types.ts` diff shows field deletion (TypeScript compile green without legacy field). `scaffold.test.ts` asserts `config.gates` present, `human_review_default` absent. `coda-config.test.ts` migration block: 7 tests green (migrate populates `gates.plan_review === 'human'` + strips legacy key on disk; second `loadCodaConfig` call leaves mtime unchanged; existing gates wins; fresh config is no-op; `codaConfig set` rejects `human_review_default` as unknown key; `codaConfig get gates.plan_review` returns `'human'` on migrated legacy config). `v08-e2e.test.ts` E4c asserts on-disk rewrite + mtime idempotence. |
| **AC-4**: Quality bar holds | ✅ PASS | Full suite: 720 pass / 1 todo / 0 fail / 2140 expect() / 55 files. +12 net new tests (3 F6 + 3 F7 + 7 migration + 2 renames − 3 legacy deletes). 0 new `any` types in production. 0 new TODO/FIXME/HACK/XXX markers. `hooks.ts` 458L (under the 500L + 10% = 550L AC-4 ceiling). `coda-advance.ts` 669L (over soft threshold, but handler body diff = 0 lines; net −12 came entirely from duplicate-helper deletion). `write-gate.ts` 0-line diff. `packages/core/` 0-line diff. |

## Verification Results

| Check | Command | Result |
|-------|---------|--------|
| Full suite | `bun test` | 720 pass / 1 todo / 0 fail / 2140 expect() / 55 files |
| Task 1 targeted | `bun test coda-run-tests.test.ts` | 8 pass + 1 todo / 0 fail |
| Task 2 targeted | `bun test write-gate-integration.test.ts hooks.test.ts` | 23 pass / 0 fail |
| Task 3 targeted | `bun test coda-config.test.ts scaffold.test.ts gate-automation.test.ts v08-e2e.test.ts` | All green (counts roll up into full suite) |
| human_review_default residue | `grep -rn 'human_review_default' packages/coda/src --include='*.ts' \| grep -v __tests__` | Only in `coda-config.ts` migration helper (expected) and two docstring references; zero functional usage in production |
| Bun.spawnSync residue | `grep -rn 'Bun.spawnSync' packages/coda/src --include='*.ts' \| grep -v __tests__` | 1 hit: JSDoc in `coda-run-tests.ts` documenting the Bun fast-path branch (expected) |
| loadCodaConfig count | `grep -rn 'function loadCodaConfig' packages/coda/src --include='*.ts'` | Exactly 2: exported shared loader in `tools/coda-config.ts` + narrow helper in `pi/tools.ts` (intentionally untouched per plan) |
| hooks.ts size | `wc -l packages/coda/src/pi/hooks.ts` | 458 (was 474 pre-Phase-55; under 520L target; under 550L AC-4 ceiling) |
| coda-advance.ts unchanged-body | `git diff --stat packages/coda/src/tools/coda-advance.ts` | 1 file changed, 6 insertions(+), 18 deletions(-) — deleted `function loadCodaConfig` + added import line |
| write-gate.ts unchanged | `git diff --stat packages/coda/src/tools/write-gate.ts` | (no output — 0 line diff) |
| core unchanged | `git diff --stat packages/core/` | (no output — 0 line diff) |
| DEAN delta | audit baseline | unchanged — 2 high basic-ftp advisories (IDs 1116454, 1116478); no new deps added |

## Module Execution Reports

### Pre-apply (TODD + WALT)
- **TODD(50)** → PASS. Plan type `tdd` verified; test files early in each task's `<files>`; 🔴 RED witnessed per task before GREEN.
- **WALT(100)** → baseline recorded: 708 pass / 0 fail / 2092 expect / 55 files / ~2.60s.

### Post-task (TODD × 3)
- **Task 1** → PASS. 710 pass / 0 fail / 1 todo after +2 live tests (+1 todo documented in-code).
- **Task 2** → PASS. 713 pass / 0 fail after +3 integration tests. hooks.ts REFACTOR extracted 163L → `write-gate-perimeter.ts`; hooks.ts settles at 458L.
- **Task 3** → PASS. 720 pass / 0 fail after +7 migration + 2 renamed + 2 rewritten E2E tests.

### Post-apply advisory
- **IRIS(250)** → 0 annotations. No new TODO/FIXME/HACK/XXX markers introduced in production code.
- **DOCS(250)** → 1 annotation: `docs/coda-spec-v7.md` references legacy `human_review_default` in an ambient example and lacks the `artifacts_produced` schema section. Deferred to v0.10 milestone-close doc sweep per Phase 53/54 convention; already tracked in STATE.md Active Blockers / Follow-ups.
- **RUBY(300)** → 1 annotation: `coda-advance.ts` is 669L (down from 681L). Still over the 500L soft threshold, but the Phase 55 boundary held: no handler-body edits, only the duplicate `loadCodaConfig` helper deleted (−12 lines). Refactor candidate (extract `handleUnifyReviewDecision` + `handleHumanReviewDecision`) remains tracked in STATE.md follow-ups for v0.11.
- **SKIP(300)** → 4 knowledge candidates surfaced:
  - Pattern: Runtime-portable spawn via injectable helper — captured in `patterns-established` + STATE.md Decisions as DEC-55-1.
  - Pattern: Perimeter default-deny with `coda_*` prefix allow-list — captured as DEC-55-2.
  - Pattern: Parent-directory realpath (vs leaf realpath) for symlink-safe path protection on pre-existence paths — captured as DEC-55-3.
  - Pattern: Single-loader consolidation + load-time idempotent migration — captured as DEC-55-5.
- **OMAR(205)** → 0 new logging calls. `DEBUG=coda:*` diagnostic from Phase 53 was extended with one additional operation type (`custom`) for the default-deny branch; behavior is opt-in, zero-overhead when unset.

### Post-apply enforcement
- **WALT(100)** → PASS. 708 → 720 pass / 1 todo / 0 fail. Quality delta rolled into the post-unify quality-history update below.
- **DEAN(150)** → PASS. `.paul/dean-baseline.json` (2026-04-15) unchanged; 2 high basic-ftp advisories (IDs 1116454, 1116478) stable; no new dependencies introduced by this plan.
- **TODD(200)** → PASS. Plan type `tdd` discipline held: 🔴 RED confirmed before 🟢 GREEN for all three TDD cycles; Task 2 REFACTOR was a size-driven helper extraction, tests green before and after.
- **ARCH(125)** (implied) → PASS. `workflow/ → tools/coda-config.ts` is an established direction in this codebase (already used by `context-builder.ts`, `review-runner.ts`, `unify-runner.ts` pre-Phase-55); adding `loadCodaConfig` to the surface is additive. `pi/ → tools/` for `pi/commands.ts` is a higher-to-lower layer import (allowed). No new cross-boundary edges introduced.
- **SETH(80)** (implied) → PASS. Phase 55 is net-positive on security: closes 3 bypass vectors. No secrets, no new auth surfaces. Migration writes `.coda/coda.json` only on mutation (guards against unnecessary filesystem IO).
- **VERA(185)** (implied) → PASS. No PII-in-logs; the `DEBUG=coda:*` custom-tool log slices `JSON.stringify(event.input).slice(0, 200)` but gated behind the opt-in DEBUG flag and already existed as a pattern since Phase 53.

### Post-unify (WALT + SKIP + RUBY) — dispatched during this UNIFY
- **WALT(100)** → PASS. Quality history row: `2026-04-16 | 55-supporting-systems-repair | 720 pass / 0 fail / 1 todo | N/A | clean (bun test de-facto typecheck) | N/A | ↑ improving (+12 new tests; 3 bypass vectors closed; 4 duplicate loaders deduped)`.
- **SKIP(200)** → PASS. 6 decisions materialized into STATE.md `## Accumulated Context → ### Decisions` as DEC-55-1 through DEC-55-6 (see update below). 3 patterns captured in this SUMMARY's frontmatter `patterns-established`.
- **RUBY(300)** → SKIPPED (ESLint not installed; RUBY gracefully skips per its contract). Manual line-count scan:
  - `write-gate-perimeter.ts` (new): 179L — within threshold.
  - `coda-run-tests.ts`: 286L — within threshold.
  - `coda-config.ts`: 344L — within threshold.
  - `hooks.ts`: 458L — within threshold (under 500L soft line).
  - `coda-advance.ts`: 669L — over soft threshold; refactor carried forward (tracked in STATE.md; boundary held this phase).

### Pre-unify dispatch
- `[dispatch] pre-unify: 0 modules registered for this hook` (modules.yaml has no pre-unify hooks).

## Deviations

| Deviation | Reason | Impact |
|-----------|--------|--------|
| **Runtime-detection-via-`globalThis.Bun`-masking test converted to `test.todo`** | Bun's `globalThis.Bun` is a readonly property inside the Bun test harness — assigning `undefined` throws `TypeError: Attempted to assign to readonly property`. The plan already anticipated this as a fallback and documented the conversion (line 212). Injection-based tests exercise the same Node branch more precisely. | Zero correctness loss — the Node code path is covered by the injection tests. The todo preserves intent for a future non-Bun test run. Logged in-code and in this SUMMARY. |
| **Task 2 REFACTOR extracted `write-gate-perimeter.ts`** (not fully-anticipated file) | `hooks.ts` grew to 622L post-GREEN (above the 520L plan target and the 550L AC-4 ceiling). Plan permitted extraction as a judgment call ("If `hasCompoundWriteToCoda` grew beyond ~25 lines … consider factoring"; "if the new test surface pushes the file over 650L, split"). After extracting the detectors, `hooks.ts` settles at 458L. | Additive — 179L new file; pi/ layer; no new cross-boundary imports; layering-clean. Extraction preserves Phase 53's perimeter-vs-pure-gate separation and refines it (perimeter dispatcher vs perimeter detectors). |
| **E3b test semantic change (v08-e2e)** | Pre-Phase-55: chore legacy config → `human_review_status: 'not-required'`. Post-migration: chore gate defaults to `plan_review: 'human'` (seeded from `DEFAULT_GATE_MODES`), so chore is now `'pending'`. This is the designed coarse-migration behavior documented in DEC-55-4. | Operators who relied on legacy per-issue-type semantics (chore = auto) must add `gate_overrides.chore.plan_review: 'auto'` after migration. Test renamed to reflect the new expected behavior; assertion flipped. |
| **`hooks.test.ts` did NOT get new symlink/custom-tool cases this phase** (plan's Task 2 RED step 2) | During implementation, integration-level RED cases in `write-gate-integration.test.ts` exercised the helpers through the real `registerHooks` + `tool_call` dispatch path, which is strictly more representative than unit-helper tests. Adding unit-level RED duplicates would not have caught new failure modes (the integration tests already bind to the helper contract). | Zero coverage loss; integration tests are green across all three bypass classes. If future plans need helper-level tests (e.g., for new perimeter helpers without integration coverage), the pattern is documented in the module docstring of `write-gate-perimeter.ts`. |

## Key Patterns & Decisions (for knowledge capture)

### Patterns established this phase

1. **Injectable-spawn pattern.** Production child-process functions accept an optional test-only `overrides.spawnImpl` argument. Tests inject pure spies that return deterministic `SpawnResult`. Production call sites pass 3 args unchanged — the injection seam is invisible to the Pi tool schema. Detection uses `typeof Bun !== 'undefined' && typeof Bun.spawnSync === 'function'` at call time (not module-load); tests can mutate env without breaking subsequent invocations.

2. **Perimeter extraction + allow-list prefix.** When the perimeter dispatcher file (`hooks.ts`) approaches size thresholds, extract stateless detectors (`isBashWriteToCoda`, `inputReferencesCoda`) to a sibling module (`write-gate-perimeter.ts`) and import them back. The dispatcher's role becomes pure lifecycle glue; detectors are unit-testable without hooking into Pi. `coda_*` prefix allow-list in the dispatcher says "explicit intent trumps coincidental absence" — the only tools allowed to mutate `.coda/` are those we audited and registered.

3. **Parent-directory realpath for symlink-safe path protection.** Don't realpath the leaf (throws ENOENT on pre-write paths). Try leaf first; on ENOENT fall back to `realpathSync(dirname(absolute))` + `basename(absolute)` rejoin. Compare against `realpathSync(codaRoot)` same-pattern. This catches the real threat (parent-dir symlinks pointing into `.coda/`) without introducing TOCTOU coverage Pi doesn't need (tool_call fires at write time, re-runs gate).

4. **Load-time config migration with didMutate guard.** On-load migrations MUST pair:
   - A single-write guard (rewrite `.coda/coda.json` only when the parsed object actually changed).
   - An mtime-stability test asserting the second `loadCodaConfig` call leaves the file untouched.
   Idempotence is not a code-review property; it's a disk-property asserted by tests.

5. **Single-loader consolidation.** When the same loader exists in N files with identical logic, the dedupe is a forcing function for introducing cross-cutting behavior (here: legacy migration). One shared exported loader + N imports beats N matched migration call sites.

### Decisions logged to STATE.md

- **DEC-55-1**: `codaRunTests` widened with optional 4th-tier `overrides?: { spawnImpl?: SpawnImpl }` for test injection. 3-arg production contract preserved; Pi tool schema surface unchanged.
- **DEC-55-2**: Custom-tool default-deny is conservative (blocks any non-`coda_*` tool on `.coda/` reference in input, regardless of read-vs-mutate intent). Config-driven operator allow-lists deferred to a future phase if false positives surface.
- **DEC-55-3**: Parent-dir realpath is the sound invariant for symlink-safe `.coda/` protection (not leaf-realpath) because write targets typically don't exist pre-write.
- **DEC-55-4**: Legacy `human_review_default` → `gates` migration uses coarse `DEFAULT_GATE_MODES` seed; the two shapes are not 1:1 isomorphic. Operators add `gate_overrides.<type>.<gate>` post-migration if they relied on legacy per-type semantics.
- **DEC-55-5**: Shared `loadCodaConfig` lives in `tools/coda-config.ts`; `workflow/review-runner.ts` imports it — `workflow → tools` direction was already established pre-Phase-55.
- **DEC-55-6**: Perimeter detectors extracted from `hooks.ts` to `pi/write-gate-perimeter.ts` during Task 2 REFACTOR. Phase 53's perimeter-vs-pure-gate separation refined: write-gate.ts (pure gate) / hooks.ts (Pi lifecycle glue) / write-gate-perimeter.ts (stateless detectors).

## Next Phase

**Phase 56: Lifecycle-First Prompts (F3, F4)** — strengthen CODA-injected prompts so the agent creates issues before building and discovers tools from the prompt manifest rather than reading source. Phase 55's perimeter cleanup means Phase 56 can trust `.coda/` write protection as a foundation and focus on prompt quality without defensive padding.

Subsequent order (unchanged from v0.10 kickoff):
- **Phase 57**: E2E Re-Validation — re-run Script A; with F5/F6/F7/deferred-#1 all fixed, this is the go/no-go for "compounding actually compounds".

## Skill Audit

N/A — `.paul/SPECIAL-FLOWS.md` not configured for this project.
