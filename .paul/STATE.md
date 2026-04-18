# Project State
## Project Reference
See: .paul/PROJECT.md (updated 2026-04-18)
Version: v0.11.0-dev
**Core value:** Enabling developers to build durable, maintainable software through disciplined agent-assisted workflows
**Current focus:** v0.11 Six Fixes and Re-Validation
## Current Position
Milestone: v0.11 Six Fixes and Re-Validation
Phase: 60 of 60 (E2E Re-Validation) — ready to plan
Plan: Not started
Status: Ready for PLAN
Last activity: 2026-04-18T12:12:07-04:00 — Unified .paul/phases/59-lifecycle-integrity/59-01-PLAN.md into 59-01-SUMMARY.md, recorded post-unify quality/codegraph history, documented the accepted stale-VERIFY-exit-code gap, and transitioned v0.11 to Phase 60 planning after PR #29 merged.
Progress:
- v0.11 Six Fixes and Re-Validation: [████████░░] 67% (2 of 3 phases complete)
- Phase 60: [░░░░░░░░░░] 0% (not started)
## Loop Position
Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ✓     [Loop complete - ready for next PLAN]
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

### Active Blockers / Follow-ups
- Phase 60 still owes the live Script A rerun and binary milestone verdict for v0.11. The next plan must use the same success criteria as Phase 57's live run, not softened ones.
- Accepted Phase 59 limitation: `state.last_test_exit_code` is still a single global slot. VERIFY now fails closed on missing evidence and the prompt requires a fresh `coda_run_tests` run, but a stale BUILD-phase success can still mask a missing VERIFY rerun if the agent ignores that prompt.
- `docs/coda-spec-v7.md` needs a section documenting `artifacts_produced` schema + evidence gate AND a refresh removing legacy `human_review_default` references (deferred from P54/P55 per plan; carry to milestone close).
- `coda-advance.ts` grew to 704L in Phase 58 (was 669L); still exceeds 500L soft RUBY threshold; candidate refactor = extract `handleUnifyReviewDecision` + `handleHumanReviewDecision` into a sibling file (v0.11).
- `coda-advance.test.ts` grew to 857L (was 802L); test-side extract should follow any production-side split.
- `codaRunTests` runtime-detection via `globalThis.Bun` masking is retained as `test.todo` (Bun global is readonly in the Bun test harness); future non-Bun test harness or integration test can promote it.
- Custom-tool default-deny is conservative by design (DEC-55-2); if operators report false positives with third-party Pi extensions, consider adding a config-driven allow-list as a v0.11 follow-up.
- `README.md` drift remains after Phase 56 lifecycle-guidance changes; DOCS flagged it during APPLY and it stays deferred outside the current code-focused phase scope.
- Phase 57 artifacts (`.paul/phases/57-e2e-re-validation/`, `docs/v0.10/E2E-COMPOUNDING-FINDINGS-v2.md`) remain uncommitted. Phase 57 transition/PR work still owes a follow-up commit.
### Git State
Branch: feature/59-lifecycle-integrity (PR merged; local closeout still on feature branch)
Remote: https://github.com/coctostan/coda.git
Last commit: PR #29 merge commit on `main` = `5f9babb53af7a43dc23bc1585cf2e800f7b309ef`
PR: #29 https://github.com/coctostan/coda/pull/29 (MERGED)
Feature branches cleaned: feature/57-e2e-re-validation (merged via #25), feature/58-transition (merged via #26)
Test baseline (post-P59 UNIFY): 751 pass / 1 todo / 0 fail / 2287 expect / 56 files (targeted workflow suite: 51 pass / 0 fail).
DEAN baseline: 1 critical (protobufjs) + 3 high (basic-ftp); unchanged since 2026-04-17T00:54:41Z.

## Session Continuity
Last session: 2026-04-18T12:12:07-04:00
Stopped at: Phase 59 complete; SUMMARY written; Phase 60 is next.
Next action: Run `/paul:plan` for Phase 60 (E2E Re-Validation). Sync to `main` first if you want the next phase to start from the merged base instead of the still-open local feature branch.
Resume file: .paul/ROADMAP.md
Resume context:
- Phase 59 is canonically summarized at `.paul/phases/59-lifecycle-integrity/59-01-SUMMARY.md`.
- PR #29 is merged; VERIFY now fails closed on missing explicit evidence, UNIFY prompts are gate-aligned, and `packages/coda/src/workflow/__tests__/lifecycle-e2e.test.ts` proves dishonest VERIFY / empty UNIFY blocking plus honest DONE success.
- Post-unify history has been updated in `.paul/quality-history.md` and `.paul/CODI-HISTORY.md`.
- The accepted stale-`state.last_test_exit_code` limitation, README drift, spec-doc refresh, and Phase 57 artifact cleanup remain open carry-forward items for milestone close / live rerun context.
---
*STATE.md — Updated after every significant action*