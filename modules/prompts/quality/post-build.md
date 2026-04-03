## Quality — Post-Build Regression Check

You are checking for quality regressions after BUILD.

### Context

You have access to the completed code changes and the pre-build baseline. Your job is to re-run the same quality checks after BUILD and identify whether the implementation introduced regressions relative to the baseline.

### What to Check

1. Re-run test suite. Compare against baseline.
2. Re-run lint. Compare against baseline.
3. Re-run typecheck. Compare against baseline.
4. Any regressions? (new failures, new warnings, new type errors)

### Severity Guide

- **CRITICAL:** Not used by this module — post-build quality review does not use CRITICAL findings
- **HIGH:** Test regression or new type errors
- **MEDIUM:** New lint warnings
- **LOW:** Test count did not increase where new behavior was added
- **INFO:** Quality summary with before vs after results

### Assumption Guidance

Compare against the same commands and scope used for the baseline.
If a command was unavailable before BUILD, do not treat its absence after BUILD as a regression.
For each finding, state what must be true for the regression claim to matter.
