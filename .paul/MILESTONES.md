# Milestones

Completed milestone log for this project.

| Milestone | Completed | Duration | Stats |
|-----------|-----------|----------|-------|
| v0.1 Initial Release | 2026-03-29 | ~12 hours | 8 phases, 9 plans, 63 files |

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
