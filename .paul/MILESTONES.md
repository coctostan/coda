# Milestones

Completed milestone log for this project.

| Milestone | Completed | Duration | Stats |
|-----------|-----------|----------|-------|
| v0.1 Initial Release | 2026-03-29 | ~12 hours | 8 phases, 9 plans, 63 files |
| v0.2 Autonomous Loops | 2026-04-01 | 4 days | 9 phases, 10 plans, 255 tests |
| v0.3 Module System | 2026-03-29 | ~2 days | 8 phases, 8 plans, 33 files |

---

## ✅ v0.1 Initial Release

**Completed:** 2026-03-29  
**Version:** v0.1.0  
**Duration:** ~12 hours

### Stats

| Metric | Value |
|--------|-------|
| Phases | 8 |
| Plans | 9 |
| Files changed | 63 |
| Tests | 188 passing |
| TypeScript | `tsc --noEmit` clean |

### Key Accomplishments

- Built the `@coda/core` data layer for markdown records, YAML frontmatter, section operations, and directory listing.
- Added the state engine with gated phase transitions, structured gate results, and atomic persistence.
- Implemented the CODA tool layer: create, read, update, edit-body, advance, status, run-tests, and write-gate protections.
- Shipped Todd and Walt as data-backed module prompts with hook-point routing.
- Built FORGE greenfield scaffolding, reference-doc generation, and first-milestone creation.
- Added the workflow engine: context builder, phase runner, and build-loop sequencing.
- Integrated CODA into Pi with `/coda`, 7 registered tools, lifecycle hooks, and extension entrypoint.
- Rewrote the Pi integration against the real `ExtensionAPI` and completed a live end-to-end dogfood run.
- Closed milestone verification with 188 passing tests, clean TypeScript, and a reusable E2E playbook plus findings report.

### Key Decisions

- Manual YAML parser in `@coda/core` to keep the core package free of external parsing dependencies.
- State gates return structured `{ passed, reason }` results instead of throwing.
- State persistence uses temp-file + rename for atomic writes.
- Pi integration uses a single `/coda` command with subcommand parsing to match Pi's command model.
- Replaced `import.meta.dir` with `import.meta.url` + `fileURLToPath` for Bun and jiti compatibility.
- Used a temporary `node_modules/@coda/core` symlink during E2E; long-term fix should bundle or publish the dependency boundary cleanly.

---

## ✅ v0.2 Autonomous Loops

**Completed:** 2026-04-01
**Version:** v0.2.0
**Duration:** 4 days (2026-03-29 to 2026-04-01)

### Stats

| Metric | Value |
|--------|-------|
| Phases | 9 |
| Plans | 10 (9 phase plans + 1 fix) |
| Tests | 255 passing |
| TypeScript | `tsc --noEmit` clean |
| External deps in core | 0 |

### Key Accomplishments

- Added `submode`, `loop_iteration`, exhaustion checks, and loop config to the core state machine.
- Built the autonomous review/revise runner with deterministic structural checks, durable revision-instructions artifacts, and revision history.
- Built the autonomous verify/correct runner with per-AC failure artifacts, correction task generation, and BUILD-loop integration.
- Added the human review gate with durable `human_review_status`, review→build gating, and persisted human feedback routing.
- Implemented exhaustion handling with explicit exhausted outcomes, human recovery paths, and durable `/coda back` and `/coda kill` operator commands.
- Updated Pi integration with submode-aware `before_agent_start`, command/status guidance, and workflow-owned runtime metadata for revise/correct flows.
- Resolved the live operator trigger gap so `coda_advance` into `review`/`verify` runs the autonomous loops and queues follow-up turns through Pi messaging.
- Fixed the `loadTasks()` boundary to normalize optional array fields, preventing crashes when live-created tasks omit `depends_on` or other optional frontmatter.
- Completed live CMUX/Pi validation: review → revise → re-review → build → verify all passed in a fresh session.

### Key Decisions

- Submodes remain phase-local, not new top-level phases — preserves linear lifecycle while enabling bounded review/verify cycles.
- Deterministic structural review writes durable revision artifacts — keeps the loop mechanical, auditable, and disk-backed.
- Human review state persists in existing plan frontmatter/body artifacts — no new storage layers.
- Exhausted loops preserve artifacts and require explicit human recovery — prevents hidden auto-advancement.
- Pi-facing runtime metadata comes from workflow-owned phase context — keeps Pi integration thin.
- Successful `coda_advance` into `review`/`verify` is the supported live autonomous trigger — closes the operator-surface gap without widening the command surface.
- Optional frontmatter arrays are normalized at the `loadTasks()` boundary — single defense point protects all downstream runners.

---

## ✅ v0.3 Module System

**Completed:** 2026-03-29
**Version:** v0.3.0
**Duration:** ~2 days (2026-04-01 to 2026-03-29)

### Stats

| Metric | Value |
|--------|-------|
| Phases | 8 |
| Plans | 8 |
| Files changed | 33 |
| Tests | 363 passing (144 core + 219 coda) |
| TypeScript | `tsc --noEmit` clean |
| External deps in core | 0 |

### Key Accomplishments

- Built foundational module types in `@coda/core` L3: `HookPoint`, `FindingSeverity`, `Finding`, `HookResult`, `ModuleDefinition` with `validateFinding`/`validateFindings` schema validation.
- Implemented module registry with hardcoded `security` + `tdd` definitions, config-driven enable/disable, priority-sorted hook lookup, and prompt path resolution.
- Created the two-method dispatcher API: `assemblePrompts()` for phase-boundary prompt injection and `parseAndCheckFindings()` for structured finding extraction with `exceedsThreshold` blocking.
- Shipped 5 prompt files (security/pre-plan, security/post-build, tdd/pre-build, tdd/post-task, tdd/post-build) with 25 structural tests.
- Wired modules into the workflow engine: dispatcher fires at phase boundaries, `moduleBlockFindings` blocks build→verify gate, old todd/walt system deleted.
- Added config integration: `coda.json` `modules` section drives per-project enable/disable and `blockThreshold` overrides.
- Implemented findings persistence to `.coda/issues/{slug}/module-findings.json` with `summarizeFindings` for cross-phase context injection in verify/unify phases.
- Created 22 E2E tests validating the complete integrated path: config → registry → dispatcher → prompts → findings → persistence → gates → context summarization.

### Key Decisions

- D1: `blockThreshold: FindingSeverity | 'none'` — enables advisory-only modules that never block.
- D2: Two-method dispatcher API (`assemblePrompts` + `parseAndCheckFindings`) — keeps the dispatcher session-unaware.
- D3: Only security + tdd in v0.3 — no half-registered modules; architecture/quality/knowledge modules deferred to v0.3.1.
- D4: Old todd/walt deleted at workflow integration — single clean migration cut.
- D5: `moduleBlockFindings` in `GateCheckData` — gate system remains the authority for phase transitions.

---
