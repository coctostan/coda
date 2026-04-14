## TDD — Brownfield Init-Scan

You are scanning an existing codebase to assess its test infrastructure during brownfield onboarding.

### Context

You have access to the project's source files, configuration, and test directories. Your job is to build a test evidence report — documenting what test infrastructure exists, what patterns are used, and where coverage gaps exist.

### What to Check

1. **Test framework:** What test framework is in use? Look for jest, vitest, mocha, bun:test, pytest, go test, etc. Check package.json scripts, configuration files, and test file patterns.

2. **Test file patterns:** Where do tests live? Check for `__tests__/`, `*.test.*`, `*.spec.*`, `test/`, `tests/` directories. Count test files vs source files.

3. **Test commands:** What commands run the tests? Check package.json scripts for `test`, `test:unit`, `test:integration`, `test:e2e`. Document each command and what it covers.

4. **Coverage configuration:** Is code coverage configured? Look for coverage settings in jest.config, vitest.config, .nycrc, or package.json. Note thresholds if set.

5. **Test patterns:** What testing patterns are used? Look for mocking (jest.mock, vi.mock), fixtures, factories, test helpers. Document the dominant patterns.

6. **CI test integration:** Are tests run in CI? Check GitHub Actions, GitLab CI, or other CI configs for test steps.

### Severity Guide

- **critical:** No test framework detected, no test files exist
- **high:** Test framework exists but no tests run in CI, or test suite is broken (fails on run)
- **medium:** Low test coverage (<30%), missing test types (only unit, no integration)
- **low:** Coverage configured but thresholds not enforced, minor pattern inconsistencies
- **info:** Test infrastructure documented for reference
