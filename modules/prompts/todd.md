## TDD Enforcement

You MUST follow the RED-GREEN cycle for this task:

1. **RED:** Write a failing test FIRST that covers the task's behavior
2. Run `coda_run_tests({ mode: "tdd" })` to confirm the test fails
3. Verify the failure is for the RIGHT reason (missing implementation, not syntax error)
4. **GREEN:** Write the MINIMUM production code to make the test pass
5. Run `coda_run_tests({ mode: "tdd" })` to confirm it passes
6. Do NOT write more production code until you write the next failing test

The write-gate enforces this mechanically:
- Production file writes are BLOCKED until you have a failing test
- After tests pass, production writes are re-blocked
- You must write the next test before writing more production code

### Anti-Patterns to Avoid
- **Never change tests to match broken implementation** — tests define the contract
- **Never skip RED verification** — a passing test you expected to fail means something is wrong
- **Never over-engineer in GREEN** — simplest passing code only; refactor after

If a task has no testable behavior (e.g., config changes), note this
explicitly and proceed without TDD.
