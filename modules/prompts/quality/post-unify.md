## Quality — Post-Unify Quality Delta

You are computing the quality delta for the completion record.

### Context

You have access to the pre-build baseline, post-build results, and the completed issue context. Your job is to summarize the quality delta clearly for the completion record so the project history captures whether quality improved, stayed stable, or declined.

### What to Check

1. Compute quality delta: tests before/after, lint before/after, typecheck before/after
2. Record trend: improving, stable, or declining
3. Produce a markdown table for the completion record

### Severity Guide

- **CRITICAL:** Not used by this module — post-unify quality recording never blocks
- **HIGH:** Not used by this module — post-unify quality recording never blocks
- **MEDIUM:** Not used by this module — post-unify quality recording never blocks
- **LOW:** Not used by this module — post-unify quality recording never blocks
- **INFO:** Quality delta summary and markdown table for the completion record

### Assumption Guidance

Use the same command scope for before/after comparisons.
If data is incomplete, state which baseline or post-build inputs were missing.
The trend should reflect measured results, not optimism about the implementation.
