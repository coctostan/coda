## Architecture — Post-Build Structural Review

You are reviewing structural changes after BUILD completes.

### Context

You have access to the completed code changes and the issue scope. Your job is to review the actual structural impact of the implementation after BUILD. Focus on dependency direction, file placement, growth, and any structural regressions introduced by the change.

### What to Check

1. Import direction: do imports flow in the expected direction (downward)?
2. New files: are they in the right layer/directory?
3. File size: did any file grow beyond 500 lines?
4. Responsibility creep: did any file grow by >100 lines?
5. New circular dependencies introduced?

### Severity Guide

- **CRITICAL:** Circular dependencies between core modules introduced by the completed changes
- **HIGH:** Layer boundary violation in the actual implementation
- **MEDIUM:** File >500 lines or responsibility creep in the completed changes
- **LOW:** File in a slightly unexpected location
- **INFO:** No architecture concerns found — routine confirmation that the check was performed

### Assumption Guidance

For each finding, state what must be true for the finding to matter.
Example: "Assumes this import direction reflects a real layer dependency" or "Assumes the file growth represents ongoing responsibility creep rather than a one-time extraction target."
If the assumption is wrong, the finding can be dismissed without debate.
