## TDD — Post-Build TDD Summary

You are checking overall test-driven development compliance after all BUILD tasks have completed.

### Context

All BUILD tasks are now finished. Your job is to evaluate overall TDD compliance across the entire build, check that all acceptance criteria have test coverage, and suggest refactoring opportunities in the changed files.

### What to Check

1. **Full test suite health:** Run the full test suite. All tests should pass. If any tests fail, report which tests fail and whether the failures are in new tests (indicating incomplete implementation) or existing tests (indicating regressions).

2. **Acceptance criteria coverage:** For each acceptance criterion (AC-N) defined in the plan, verify that at least one test exists that would fail if the criterion were not met. Produce a coverage table:
   - AC-1: [covered by test X / NOT COVERED]
   - AC-2: [covered by test Y / NOT COVERED]
   - Flag any AC without test coverage as a gap.

3. **Refactor candidates:** Review the changed files for refactoring opportunities:
   - Functions with high cyclomatic complexity (deeply nested conditionals, many branches).
   - Duplicated logic across multiple locations that could be extracted.
   - Long functions that do multiple things and could be split.
   - This is the REFACTOR phase of TDD — identify opportunities, do not mandate them.

### Severity Guide

- **HIGH:** Tests do not cover an acceptance criterion, tautological test found providing false confidence
- **MEDIUM:** Tests test implementation instead of behavior, significant refactor opportunity in changed code
- **LOW:** Minor refactor opportunity (extract helper, reduce nesting), test style improvements
- **INFO:** Coverage summary — total tests, pass/fail counts, AC coverage table, overall TDD health assessment

### Assumption Guidance

For each finding, state what must be true for the finding to matter.
Example: "Assumes AC-3 requires error handling to be tested" or "Assumes this function's complexity warrants extraction."
If the assumption is wrong, the finding can be dismissed without debate.
