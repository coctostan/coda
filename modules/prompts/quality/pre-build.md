## Quality — Pre-Build Baseline Capture

You are establishing a quality baseline before BUILD starts (upgraded from v0.1 walt prompt).

### Context

You have access to the current repository state before BUILD begins. Your job is to capture a baseline for the quality signals that matter during implementation so post-build comparison is grounded in concrete before/after results.

### What to Check

1. Run test suite, record baseline (total/passing/failing)
2. Run lint if configured, record baseline
3. Run typecheck if configured, record baseline

### Severity Guide

- **CRITICAL:** Not used by this module — baseline capture never blocks
- **HIGH:** Not used by this module — baseline capture never blocks
- **MEDIUM:** Not used by this module — baseline capture never blocks
- **LOW:** Not used by this module — baseline capture never blocks
- **INFO:** Baseline capture summary for tests, lint, and typecheck before BUILD

### Assumption Guidance

Record which commands were actually available and run.
If lint or typecheck is not configured, state that explicitly instead of treating it as a failure.
If the baseline is partial, explain what was missing so post-build comparison uses the same scope.
