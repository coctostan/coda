# CODA Ecosystem — Roadmap

## Philosophy

Thin vertical slice → E2E test → fix → widen. Every version is a testable system, not a collection of disconnected layers.

---

## v0.1 — MVP: Prove the Loop Works

**Goal:** One issue can go through the full lifecycle on a test project. Not production-ready. Proves the core mechanics.

### What it does:
- `/coda forge` creates a greenfield project (minimal: ask 3-5 questions, produce ref-system.md + ref-prd.md, scaffold .coda/)
- `/coda new` creates an issue
- SPECIFY: human writes ACs collaboratively, spec delta drafted
- PLAN: agent decomposes into tasks
- REVIEW: single-pass review (no review/revise loop yet)
- BUILD: autonomous task loop with TDD write-gate + basic quality checks
- VERIFY: check ACs, run tests
- UNIFY: write completion record, merge spec delta into ref-system.md
- VCS: feature branch per issue, commit per task

### Layer scope:

| Layer | v0.1 Scope | What's deferred |
|-------|-----------|-----------------|
| **M1: Data** | mdbase read/write, type schemas for issue/plan/task/record/reference. Section reader for ref docs. | Cross-type queries, topic-based retrieval |
| **M2: State** | State machine with 7 phases (no submodes). Atomic JSON persist. Basic gates (AC count, plan exists, record exists). | Submodes (review/revise, verify/correct), reconstruction from data |
| **M3: Tools** | coda_create, coda_update, coda_read, coda_advance, coda_status, coda_run_tests, coda_edit_body. Write-gate for .coda/ protection + TDD gate. | coda_query, coda_signal |
| **M4: Modules** | 2 modules lifted from PALS — **todd** (TDD) and **walt** (quality baseline). No eval engine. Prompts are simple markdown injected at pre-build and post-build hooks. | Registry, dispatcher, finding schema, eval engine, remaining 23 modules |
| **M5: FORGE** | Greenfield only. Minimal flow: ask questions → produce ref-system.md + ref-prd.md → scaffold .coda/ → create first milestone. No brownfield. No additive/transformative. | Brownfield scan, gap analysis, design advisors, CHALLENGE phase, spec checkpoints |
| **M6: Workflow** | Phase runner (linear, no submodes). Build loop (newSession per task, context injection, task summaries). Minimal context builder. No ceremony adaptation — all issues get the same flow. | Review/revise loop, verify/correct loop, ceremony, module hook dispatch, forge-aware execution |
| **M7: Pi Integration** | Extension entry point. Commands: /coda, /coda forge, /coda new, /coda advance, /coda build. Hooks: before_agent_start (context injection), tool_call (write-gate), agent_end (completion detection). | /coda pause, /coda resume, /coda back, /coda kill, /coda audit, UI dashboard, widget |

### Test plan:
Create a simple test project (e.g., a TODO CLI tool). Run one issue through the full lifecycle. Does the loop complete? Do artifacts look right? Does TDD gate work? Does spec delta merge?

### v0.1.1 — Bug fixes from E2E testing
Whatever breaks during the test run. No new features.

---

## v0.2 — Autonomous Loops

**Goal:** The REVIEW and VERIFY autonomous loops work. The system can self-correct.

| Layer | v0.2 Additions |
|-------|----------------|
| **M2: State** | Submodes (review/revise, verify/correct). Loop iteration tracking. Max iteration exhaustion with human pause. |
| **M6: Workflow** | Review runner (autonomous review → revise loop). Verify runner (autonomous verify → correct loop). Correction task generation from verification failures. |
| **M7: Pi** | Human plan review gate. Exhaustion handling (provide guidance, manually approve, kill). |

### Test plan:
Create an issue where the plan has an obvious flaw. Does REVIEW catch it and revise? Create an issue where BUILD produces code that doesn't meet an AC. Does VERIFY catch it and create a correction task?

### v0.2.1 — Fixes from testing

---

## v0.3 — Module System

**Goal:** Module infrastructure works. Multiple modules fire at phase boundaries with structured findings.

| Layer | v0.3 Additions |
|-------|----------------|
| **M4: Modules** | Registry, dispatcher, finding schema validation. Structured findings with `assumption` field. Block threshold checking. 5 core modules: security, architecture, tdd, quality, knowledge. |
| **M6: Workflow** | Module hook dispatch at phase boundaries (pre-plan, post-build, post-unify). Context builder includes module findings. |
| **Config** | Module enable/disable in coda.json. Block threshold per module. |

### Test plan:
Create an issue that touches auth code. Does the security module fire? Does it produce structured findings? Does a critical finding block advancement?

### v0.3.1 — Fixes

---

## v0.4 — Brownfield & Context

**Goal:** Can onboard an existing codebase. Context management is smart.

| Layer | v0.4 Additions |
|-------|----------------|
| **M5: FORGE** | Brownfield flow: SCAN → SYNTHESIZE → VALIDATE. Module-driven evidence gathering. |
| **M6: Workflow** | Context builder: topic-based section retrieval, dependency-based carry-forward, module finding summarization across phases. Adaptive ceremony by issue type. |
| **M1: Data** | Cross-type queries (by topic, by issue). Topic-based section retrieval from reference docs. |

### Test plan:
Point CODA at an existing open-source project. Does brownfield FORGE produce a reasonable ref-system.md? Does it identify the architecture pattern? Does context injection stay within budget?

### v0.4.1 — Fixes

---

## v0.5 — Compounding & Polish

**Goal:** UNIFY actually compounds. The system gets smarter with each issue.

| Layer | v0.5 Additions |
|-------|----------------|
| **M6: Workflow** | Full UNIFY runner: spec delta merge, reference doc updates with human approval, knowledge capture, milestone progress. |
| **M4: Modules** | Per-project module overlays (.local.md). Human feedback loop (false positives → overlays). Prompt eval infrastructure. |
| **Config** | Gate automation (human/auto/auto-unless-block). Per-issue-type gate overrides. |
| **M7: Pi** | /coda pause, /coda resume, /coda back, /coda kill. UI status dashboard. |

### Test plan:
Run 3 issues in sequence on the same project. Does ref-system.md evolve accurately? Do module overlays accumulate? Does the third issue benefit from patterns captured in the first two?

### v0.5.1 — Fixes

---

## v0.6+ — Extended Features

In priority order, based on need:

| Version | Feature | Layer |
|---------|---------|-------|
| v0.6 | Remaining 20 modules | M4 |
| v0.7 | Brownfield gap analysis + LENS integration point | M5, M4 |
| v0.8 | Additive FORGE | M5 |
| v0.9 | Transformative FORGE with spec checkpoints | M5 |
| v0.10 | Risk metadata on tasks | M4, M3 |
| v0.11 | Spec drift detection + /coda audit | M6, M7 |
| v0.12 | FORGE completeness gate | M5 |
| v1.0 | Production-ready: all v0.x features stable, docs complete | All |

---

## Post-v1

| Feature | Package |
|---------|---------|
| MUSE — ideation & incubation | packages/muse |
| LENS — deep multi-domain audit | packages/lens |
| HELM — multi-project workspace | packages/helm |
| Multi-issue coordination (worktrees) | packages/coda |
| Prompt eval CLI (standalone tool) | packages/core |

---

## Principles

1. **Every version is testable E2E.** No version ships a layer without the layers above and below it working.
2. **Fix before adding.** v0.X.1 is always fixes. v0.X+1 is new features.
3. **Test on real (test) projects.** Not unit tests alone — run the actual lifecycle.
4. **The spec (docs/coda-spec-v7.md) is the north star.** Versions approach the spec incrementally. The spec doesn't change to match what's built — it's what we're building toward.
