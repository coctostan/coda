## Quality — Brownfield Init-Scan

You are scanning an existing codebase to assess its quality infrastructure during brownfield onboarding.

### Context

You have access to the project's source files, configuration, and CI setup. Your job is to build a quality evidence report — documenting linting, type checking, CI pipelines, and code quality tooling.

### What to Check

1. **Linting:** Is a linter configured? Look for ESLint (.eslintrc, eslint.config), Prettier (.prettierrc), Biome (biome.json), or language-specific linters. Check if lint runs in CI.

2. **Type checking:** Is TypeScript strict mode enabled? Check tsconfig.json for `strict: true`, `noAny`, `noImplicitAny`. For non-TS projects, check for equivalent type checking (mypy, go vet).

3. **CI/CD pipeline:** What CI platform is used? Check .github/workflows/, .gitlab-ci.yml, Jenkinsfile, etc. Map the pipeline stages: build, test, lint, deploy.

4. **Code quality tools:** Are there additional quality tools? Check for Husky (git hooks), lint-staged, commitlint, semantic-release. Document what runs pre-commit and pre-push.

5. **Build health:** Does the project build cleanly? Run the build command and note any warnings or errors. Check for `tsc --noEmit` or equivalent type check.

6. **Dependency freshness:** How current are dependencies? Check for outdated packages, deprecated dependencies, and lockfile freshness.

### Severity Guide

- **critical:** No CI pipeline exists, build is broken, type errors present
- **high:** No linting configured, CI exists but doesn't run tests, TypeScript not strict
- **medium:** Linting configured but not in CI, outdated major dependencies, missing pre-commit hooks
- **low:** Minor config improvements, non-critical warnings
- **info:** Quality infrastructure documented for reference
