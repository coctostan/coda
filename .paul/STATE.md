# Project State
## Project Reference
See: .paul/PROJECT.md (updated 2026-04-27)
Version: v0.11.0-dev
**Core value:** Enabling developers to build durable, maintainable software through disciplined agent-assisted workflows
**Current focus:** v0.11 Six Fixes and Re-Validation complete; next milestone pending
## Current Position
Milestone: v0.11 Six Fixes and Re-Validation — complete (documented failure)
Phase: 60 of 60 (E2E Re-Validation) — complete
Plan: 60-01 complete on feature/60-e2e-re-validation
Status: Milestone complete; ready for next milestone planning
Last activity: 2026-04-27T01:37:56Z — Completed UNIFY for `.paul/phases/60-e2e-re-validation/60-01-PLAN.md`, finalized `.paul/phases/60-e2e-re-validation/60-01-SUMMARY.md`, appended post-unify WALT/CODI records, and closed v0.11 with binary verdict `still broken`.
Progress:
- v0.11 Six Fixes and Re-Validation: [██████████] 100% (3 of 3 phases complete; verdict `still broken`)
- Phase 60: [██████████] 100% (UNIFY complete)
## Loop Position
Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ✓     [Loop complete - milestone closed]
```
## Accumulated Context
### Decisions
| Decision | Phase | Impact |
|----------|-------|---------|
| blockThreshold: FindingSeverity \| 'none' | v0.3 D1 | Advisory-only modules |
| assemblePrompts() + parseAndCheckFindings() | v0.3 D2 | Two-method API |
| Only security + tdd in v0.3 | v0.3 D3 | No half-registered modules |
| Old todd/walt deleted at workflow integration | v0.3 D4 | Clean migration |
| moduleBlockFindings in GateCheckData | v0.3 D5 | Gate system authority |
| coda_report_findings tool for findings persistence | v0.4 D6 | Agent submits findings explicitly |
| Overview always-include uses exact heading match (case-insensitive) | v0.7 P36 | Topic retrieval behavior |
| context-budgets.ts separate from context-builder.ts | v0.7 P39 | Keeps context-builder under 500 lines |
| Synthetic HookContext for forge: issueSlug='forge-onboarding', phase='forge' | v0.7 P41 | Dispatcher doesn't validate against state |
| Gate-mediated UNIFY approval (not inline) | v0.8 D1 | UNIFY stays autonomous; human approval via separate review step |
| Diff presentation via conversation channel | v0.8 D2 | No special TUI widget needed |
| Overlay write via coda_edit_body (no new tool for v0.8) | v0.8 D3 | coda_feedback deferred to v0.9 |
| Gate automation replaces human_review_default | v0.8 D4 | Unified gate config with backward compat |
| Aggregate UNIFY review gate (not per-action) | v0.8 D5 | v0.8 uses post-UNIFY review; per-action deferred |
| Shared findCompletionRecordPath() helper | v0.8 D6 | 3 call sites share completion record lookup |
| Completion record carries unify_review_status | v0.8 D7 | Disk-based signal for revision detection |
| Overlay merge is append-only (default + project context) | v0.8 P49 | Deterministic merge; no interleaving |
| Agent writes overlays via coda_edit_body | v0.8 P49 | Consistent with D3, no new tool |
| 3-gate-point scope (not 5 from spec) | v0.8 P50 | specify_approval/spec_delta unimplemented; deferred |
| unify_review auto mutates completion record | v0.8 P50 | Pre-transition mutation avoids new gate bypass paths |
| Defer v0.9 Phase 53 (Brownfield); close v0.9 with just Phase 52 | Brownfield test would hit same F1/F2/F5 blockers as greenfield | 2026-04-16 | Active |
| v0.10 "Close the Agent Loop" as full pivot | v0.8 compounding plumbing works but doesn't compound in practice; fix before more FORGE | 2026-04-16 | Active |
| Plan-doc phases 52–56 → our phases 53–57 | 52 already used for v0.9 Greenfield validation | 2026-04-16 | Active |
| coda_focus keeps VCS branch creation (opt-out via create_branch=false) | Option C from posture probe — single-call ergonomics, escape hatch for non-git contexts | v0.10 P53 | Active |
| F7 root cause = integration gap not logic bug | checkWriteGate blocks .coda/ edits in unit tests; regression is in Pi-hook perimeter (tool surface audit) | v0.10 P53 | Active |
| Write-gate deeper hardening deferred to Phase 55 | Phase 53 scope = audit + regression test + diagnostic logging; Phase 55 handles new attack patterns | v0.10 P53 | Active |
| Pi mutation tool surface = {write, edit} only | Full audit of @mariozechner/pi-coding-agent/dist types | v0.10 P53 | Active |
| DEC-54-1: Evidence mechanism = hybrid self-report + disk verification | artifacts_produced declared by agent; gate verifies existence + non-empty content; fake paths and empty exemptions rejected | v0.10 P54 | Shipped |
| DEC-54-2: Ceremony knowledge stays in coda; gate stays layering-clean | gatherGateData computes artifactEvidenceRequired + specDeltaPresent from getCeremonyRules; gate never imports coda | v0.10 P54 | Shipped |
| DEC-54-3: Spec-delta enforcement is ceremony-independent | Relaxation covers empty artifacts only; declared spec_delta always enforces ref-system.md update or exemption | v0.10 P54 | Shipped |
| Inline overlay-parser in gates.ts | Avoids L3→L2 dep cycle; ~30 lines duplicated by design | v0.10 P54 | Active |
| 3 integration test fixtures updated to declare exemptions | New evidence gate correctly flagged feature-issue fixtures with empty artifacts; fix = add exemption stubs, not weaken gate | v0.10 P54 | Logged |
| DEC-55-1: codaRunTests 4th-arg `overrides.spawnImpl` for test injection | Runtime-portable spawn without globalThis.Bun masking; production API unchanged | v0.10 P55 | Shipped |
| DEC-55-2: Custom-tool default-deny with coda_* allow-list | Any non-coda_* tool_call whose input references .coda/ is blocked conservatively; operator allow-lists deferred | v0.10 P55 | Shipped |
| DEC-55-3: Parent-dir realpath for symlink-safe write protection | Write targets typically don't exist pre-write; parent-realpath is the sound invariant | v0.10 P55 | Shipped |
| DEC-55-4: Legacy human_review_default → gates migration uses coarse DEFAULT_GATE_MODES seed | Per-type/per-gate-point shapes aren't 1:1 isomorphic; operators add gate_overrides post-migration if legacy per-type semantics needed | v0.10 P55 | Shipped |
| DEC-55-5: Shared loadCodaConfig lives in tools/coda-config.ts; 4 duplicate helpers deduped | workflow → tools direction already established; migration fires on every config read path | v0.10 P55 | Shipped |
| DEC-55-6: Perimeter detectors extracted to pi/write-gate-perimeter.ts | Refined Phase 53's perimeter-vs-pure-gate split into dispatcher (hooks.ts) / detectors (write-gate-perimeter.ts) / pure gate (write-gate.ts) | v0.10 P55 | Shipped |
| DEAN baseline established: 1 critical, 3 high acknowledged | User override during Phase 56 planning after bun audit surfaced new protobufjs critical + basic-ftp high; future plans compare against refreshed baseline dated 2026-04-17 | v0.10 P56 | Active |
| Keep lifecycle guidance inside existing prompt surfaces | v0.10 P56 | Steering failures were fixed by strengthening existing bootstrap/phase/build/next_action prompts instead of adding new infrastructure |
| before_agent_start bootstraps unfocused sessions | v0.10 P56 | Unfocused agent starts now receive forge/create/focus guidance before production-code work begins |
| next_action strings must name concrete CODA tools | v0.10 P56 | Status/focus/forge handoffs now reinforce one consistent issue-first lifecycle path |
| Phase 57 live re-validation verdict = still broken | v0.10 P57 | UNIFY reconciled the live evidence: entry improved, but PLAN advancement, VERIFY truthfulness, and UNIFY artifact completion still block milestone close |
| DEC-58-1: `replaceSection` is strict — throws `ReplaceSectionError` on miss or ambiguity | v0.11 P58 | Silent append-on-miss was the Phase 57 duplicate-heading root cause; callers must pass `create_if_missing: true` to append explicitly |
| DEC-58-2: Heading normalization = trim + strip trailing colon + collapse whitespace + lowercase | v0.11 P58 | Conservative formatting equivalence only; no fuzzy substring matching |
| DEC-58-3: Any duplication of equivalent headings is explicit ambiguity | v0.11 P58 | Tool refuses to guess when bodies are already corrupted; operator deduplicates first |
| DEC-58-4: `normalizeIssueFrontmatter()` conservatively defaults missing fields | v0.11 P58 | Sparse SPECIFY frontmatter produces clean gate failure, not runtime TypeError; contained in one helper local to coda-advance.ts |
| DEC-58-5: FORGE test-command detection is Bun-only, conservative | v0.11 P58 | `coda_run_tests` pattern semantics only known-compatible with `bun test <pattern>`; other runners stay unset rather than silently break |
| DEC-58-6: FORGE `next_action` wording names `coda_config` when test commands stay null | v0.11 P58 | Keeps the lifecycle entry path one-call ergonomic per the P56 pattern; no latent TDD trap |
| DEC-59-1: VERIFY evidence defaults are fail-closed | v0.11 P59 | Missing explicit verification evidence now blocks success; task coverage alone is advisory only |
| DEC-59-2: `runVerifyRunner` reads `state.last_test_exit_code` directly | v0.11 P59 | Reachable-path hardening landed without widening `VerifyRunnerOptions` or touching `hooks.ts` |
| DEC-59-3: UNIFY prompt embeds literal gate reasons | v0.11 P59 | Prompt/gate drift now fails tests instead of silently diverging |
| DEC-59-4: Reachable-path lifecycle proof is mandatory | v0.11 P59 | `lifecycle-e2e.test.ts` is now the acceptance bar for honest VERIFY/UNIFY behavior |
| Phase 60 live re-validation verdict = still broken | v0.11 P60 | Entry and TDD usability improved, and the generated app worked, but live SPECIFY → PLAN, real UNIFY artifacts, and artifact-mediated carry-forward still failed |

### Active Blockers / Follow-ups
- v0.11 closed as a documented failure: independent shorten / redirect / stats / persistence checks passed in the external workspace, but the official lifecycle never advanced past `specify`.
- Next milestone must fix `coda_advance` falsely blocking live SPECIFY → PLAN with `Issue must have at least one acceptance criterion` even when issue-body ACs are present.
- Planner fallback still writes plan/task artifacts without moving lifecycle state; future work should remove or constrain that bypass so failures stay explicit.
- `.coda/reference/` stayed empty, `.coda/modules/` never existed, and no completion record was written during either issue; durable UNIFY artifact production and artifact-mediated carry-forward remain unproven.
- Accepted Phase 59 limitation: `state.last_test_exit_code` is still a single global slot. VERIFY now fails closed on missing evidence and the prompt requires a fresh `coda_run_tests` run, but a stale BUILD-phase success can still mask a missing VERIFY rerun if the agent ignores that prompt.
- `docs/coda-spec-v7.md` still needs the deferred artifact-evidence + gate refresh and legacy `human_review_default` cleanup.
- `README.md` drift from Phase 56 remains a repo-side follow-up outside the completed Phase 60 validation scope.
- `docs/v0.10/E2E-COMPOUNDING-FINDINGS-v2.md` remains the read-only comparison baseline; Phase 60 evidence is in `docs/v0.11/E2E-COMPOUNDING-FINDINGS.md`.
### Git State
Branch: feature/60-e2e-re-validation
Remote: https://github.com/coctostan/coda.git
Last commit: phase 60 closeout (current branch HEAD; run `git rev-parse HEAD` for exact hash)
PR: none yet
Base sync: 0 behind / 3 ahead of origin/main after Phase 60 transition commit
Test baseline (post-P60 UNIFY): 751 pass / 1 todo / 0 fail / 2287 expect / 56 files; targeted workflow suite 151 pass / 1 todo / 0 fail; external workspace 60 pass / 0 fail.
DEAN baseline: 1 critical (protobufjs) + 3 high (basic-ftp); unchanged since 2026-04-17T00:54:41Z.

## Session Continuity
Last session: 2026-04-27T01:37:56Z
Stopped at: v0.11 milestone closed as documented failure after Phase 60 UNIFY.
Next action: Start next milestone planning from the Phase 60 blockers (`/paul:milestone` or `/paul:plan` after milestone scope is chosen).
Resume file: .paul/phases/60-e2e-re-validation/60-01-SUMMARY.md
Resume context:
- Phase 60 findings and UNIFY summary are complete: `docs/v0.11/E2E-COMPOUNDING-FINDINGS.md` and `.paul/phases/60-e2e-re-validation/60-01-SUMMARY.md`.
- Fresh external workspace preserved at `~/pi/workspace/coda-test-shortener-v011`; independent runtime rerun passed shorten / redirect / stats / persistence.
- Binary verdict remains `still broken` because live SPECIFY → PLAN still fails and no real UNIFY artifacts (`.coda/reference/`, `.coda/modules/`, completion record, done transition) were produced.
- Consumed handoff archived to `.paul/handoffs/archive/HANDOFF-2026-04-20-phase-60-unify.md`.
---
*STATE.md — Updated after every significant action*