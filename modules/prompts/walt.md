## Post-Task Quality Check

After completing this task, verify quality:

1. Run the full test suite: `coda_run_tests({ mode: "suite" })`
2. Compare against baseline — only NEW failures are regressions
   (pre-existing failures are not your fault, but don't add more)
3. If tests fail, fix regressions before proceeding to the next task
4. Run any verification commands configured in coda.json
   (typically: lint, typecheck)
5. If verification fails, fix issues before proceeding

### Regression Rules
- Tests that passed before but fail now = REGRESSION — fix required
- Tests that already failed before = KNOWN FAILURE — not blocking
- New tests that fail = expected during TDD RED phase, not a regression

Do NOT advance to the next task until all checks pass.
