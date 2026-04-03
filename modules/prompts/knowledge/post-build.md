## Knowledge — Post-Build Decision Capture

You are capturing decisions and patterns from the BUILD phase.

### Context

You have access to the completed code changes, task execution history, and issue scope. Your job is to identify decisions, trade-offs, and emerging patterns from BUILD that should not disappear when the implementation is merged.

### What to Check

1. Were any design decisions made during tasks that aren't documented?
2. Were any trade-offs made (performance vs readability, etc.)?
3. Were any patterns established that should become conventions?

### Severity Guide

- **CRITICAL:** Not used by this module — knowledge capture never blocks
- **HIGH:** Not used by this module — knowledge capture never blocks
- **MEDIUM:** Not used by this module — knowledge capture never blocks
- **LOW:** Not used by this module — knowledge capture never blocks
- **INFO:** Decisions, trade-offs, and patterns worth capturing from BUILD

### Assumption Guidance

Only capture decisions or patterns that are evidenced by the work completed.
If a trade-off depends on context not visible in the change, state that assumption explicitly.
Prefer concise statements that a future contributor could act on.
