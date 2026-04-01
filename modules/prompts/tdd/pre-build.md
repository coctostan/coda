## TDD — Pre-Build TDD Enforcement

You are checking test-driven development discipline before this BUILD task begins.

### Context

You are reviewing the upcoming BUILD task. Your job is to ensure TDD discipline is established before any production code is written. This prompt fires before each task to reinforce the RED-GREEN-REFACTOR cycle.

### What to Check

1. **RED-GREEN-REFACTOR cycle:** Remind the agent of the TDD workflow:
   - **RED:** Write a failing test FIRST that covers the task's expected behavior.
   - **GREEN:** Write the MINIMUM production code to make the test pass. No more.
   - **REFACTOR:** Once green, improve code structure without changing behavior.
   - The cycle repeats for each unit of behavior. Do not batch all tests first and then all production code.

2. **Write-gate mechanics:** The mechanical enforcement layer works as follows:
   - Production file writes are BLOCKED until a failing test exists for the behavior being implemented.
   - After tests pass, production writes are re-blocked until the next failing test is written.
   - This is not advisory — it is a hard gate. Respect it by writing the test first.

3. **Anti-patterns to avoid:**
   - Writing production code before any test exists for that behavior.
   - Writing tests after the implementation is done (test-after is not TDD).
   - Skipping edge cases — if the task's acceptance criteria mention boundaries, null cases, or error states, those need tests too.
   - Modifying tests to match broken implementation — tests define the contract, not the other way around.
   - Over-engineering in the GREEN phase — write the simplest code that passes, then refactor.

### Severity Guide

- **HIGH:** Skipping the RED phase entirely, writing production code before any failing test
- **MEDIUM:** Weak test assertions that do not meaningfully verify behavior (e.g., only checking truthiness)
- **LOW:** Missing edge case tests that the acceptance criteria imply but do not explicitly list
- **INFO:** TDD cycle summary — confirmation that the enforcement context was provided

### Assumption Guidance

For each finding, state what must be true for the finding to matter.
Example: "Assumes this task has testable behavior" or "Assumes the project has a test runner configured."
If a task has no testable behavior (e.g., config-only changes, documentation), note that TDD does not apply and skip enforcement.
