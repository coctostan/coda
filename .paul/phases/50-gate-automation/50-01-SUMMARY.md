# Phase 50 Summary: Gate Automation

## Outcome
Successfully replaced the boolean `human_review_default` gate behavior with a configurable gate automation system. Three lifecycle gate points (`plan_review`, `build_review`, `unify_review`) are now configurable as `human`, `auto`, or `auto-unless-block` with project-level defaults and per-issue-type overrides in `coda.json`.

## Deliverables

### D1: gate-automation.ts (NEW — 107 lines)
- Types: `GateMode`, `GatePoint`, `GateAutomation`, `GateOverrides`
- `DEFAULT_GATE_MODES` constant: plan_review=human, build_review=auto-unless-block, unify_review=human
- `resolveGateMode()` — 4-step resolution: override → project → backward-compat → hardcoded fallback
- `shouldRequireHuman()` — mode evaluation: human=true, auto=false, auto-unless-block=conditional

### D2: CodaConfig Update (types.ts)
- Added `gates?: Partial<GateAutomation>` and `gate_overrides?: GateOverrides` to `CodaConfig`
- Marked `human_review_default` as `@deprecated` with JSDoc pointing to `gates`/`gate_overrides`
- Import of `GateAutomation`/`GateOverrides` from `workflow/gate-automation`

### D3: Scaffold Update (scaffold.ts)
- `getDefaultConfig()` now includes `gates` field with `{ plan_review: 'human', build_review: 'auto-unless-block', unify_review: 'human' }`

### D4: coda-advance Integration (coda-advance.ts)
Three surgical insertion points in the advance handler:
- **plan_review** (review→build): resolves gate mode, overrides `humanReviewRequired` in gate data
- **build_review** (build→verify): `auto` skips both module findings precondition AND gate; `human` always blocks
- **unify_review** (unify→done): `auto` mutates completion record from `pending` → `approved` before gate check
- Added `loadCodaConfig()` and `getIssueType()` helpers
- `gatherGateData()` now returns `{ gateData, issueType }` tuple

### D5: coda_config Validation (coda-config.ts)
- `gates` and `gate_overrides` added to `VALID_CONFIG_KEYS`
- `validateGateModeValue()` rejects invalid mode strings for both flat and nested structures

### D6: Ceremony Integration — Skipped (optional per plan)

## Tests
- 11 unit tests in `gate-automation.test.ts`: resolveGateMode resolution chain (6), shouldRequireHuman (4), DEFAULT_GATE_MODES (1)
- 7 integration tests in `gate-automation-integration.test.ts`: plan_review auto/human, build_review auto, unify_review auto-approve, scaffold defaults, coda_config accept/reject
- **18 new tests total, 644 passing overall**

## Acceptance Criteria
- [x] AC1: resolveGateMode() resolves from override → project → hardcoded fallback
- [x] AC2: shouldRequireHuman() correctly evaluates all 3 modes
- [x] AC3: coda_advance respects gate automation for plan_review, build_review, unify_review
- [x] AC4: Backward compatibility with human_review_default
- [x] AC5: Default scaffold includes gates field
- [x] AC6: coda_config validates gate mode values
- [x] AC7: All 626 original tests continue to pass (644 total)
- [x] AC8: 18 new tests (>16 required)
- [x] AC9: TypeScript strict clean, no any types

## Decisions
| Decision | Rationale |
|----------|-----------|
| Scope to 3 gate points (not 5 from spec) | `specify_approval` has no current implementation; `spec_delta_review`/`reference_doc_updates` are UNIFY sub-actions, not phase transitions |
| `human_review_default` deprecated, not removed | Backward compat for existing projects; removal deferred to v0.9 |
| Gate resolution at advance time, not at issue creation | Authority flows from config; aligning `/coda new` and review-runner deferred to Phase 51 |
| `build_review: human` forces block via `moduleBlockFindings = max(existing, 1)` | Reuses existing gate mechanics without new gate infrastructure |
| `unify_review: auto` mutates completion record before gate check | Pre-transition mutation avoids adding new gate bypass paths |

## Spec Delta
No spec changes required. The spec (coda-spec-v7.md lines 871–900) already describes the full gate automation architecture including `gates`, `gate_overrides`, and the 3 modes. Our v0.8 implementation is a conforming subset (3 of 5 gate points) as explicitly scoped in the plan.

## Deferred
- `specify_approval` and `spec_delta_review`/`reference_doc_updates` gate points
- Removing `human_review_default` from CodaConfig (v0.9)
- Gate-mode-aware ceremony rules
- Review runner alignment (writes `pending` regardless of gate config)
- `/coda new` config-aware issue creation
- `coda-status` gate display alignment
- E2E validation — Phase 51
