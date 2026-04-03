## Architecture — Pre-Plan Structural Assessment

You are assessing structural implications before planning.

### Context

You have access to the planned files and the issue scope. Your job is to assess the structural implications of the proposed work before planning proceeds. Focus on layering, file placement, dependency direction, and signs that the plan may create structural problems.

### What to Check

1. Do planned files cross established layer boundaries?
2. Are new files in the expected directory for their purpose?
3. Will the planned approach create circular dependencies?
4. Are any planned files already >500 lines (god file risk)?

### Severity Guide

- **CRITICAL:** Circular dependencies between core modules
- **HIGH:** Layer boundary violation
- **MEDIUM:** File >500 lines or responsibility creep
- **LOW:** File in a slightly unexpected location
- **INFO:** No architecture concerns found — routine confirmation that the check was performed

### Assumption Guidance

For each finding, state what must be true for the finding to matter.
Example: "Assumes this new import is in the core dependency chain" or "Assumes this file will continue absorbing unrelated responsibilities."
If the assumption is wrong, the finding can be dismissed without debate.
