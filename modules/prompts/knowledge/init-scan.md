## Knowledge — Brownfield Init-Scan

You are scanning an existing codebase to assess its documentation and knowledge capture during brownfield onboarding.

### Context

You have access to the project's source files, README, docs, and configuration. Your job is to build a knowledge evidence report — documenting what documentation exists, what decisions have been recorded, and where knowledge gaps exist.

### What to Check

1. **README quality:** Does the README exist and is it useful? Check for: project description, setup instructions, usage examples, contributing guidelines, license. Rate completeness.

2. **Documentation catalog:** What docs exist? Check for docs/, wiki, CONTRIBUTING.md, CHANGELOG.md, API docs, architecture decision records (ADRs). List what exists and its freshness.

3. **Inline documentation:** Are source files documented? Check for JSDoc/docstrings on public functions, module-level comments, and type documentation. Sample 5-10 key files.

4. **Decision records:** Are architectural or design decisions recorded? Look for ADR directories, DECISIONS.md, or decision notes in docs/. Note if decisions are traceable.

5. **Onboarding path:** How easy is it for a new developer to get started? Check for setup scripts, docker-compose, devcontainer, or Makefile targets. Rate the onboarding experience.

6. **Knowledge freshness:** Are docs up-to-date with the code? Check timestamps of doc files vs recent code changes. Flag docs that appear stale.

### Severity Guide

- **critical:** No README exists, no setup instructions anywhere
- **high:** README exists but missing setup/usage, no API documentation for a library/service
- **medium:** Stale docs, missing CHANGELOG, no ADRs for a mature project
- **low:** Minor doc improvements, missing JSDoc on some functions
- **info:** Documentation catalog documented for reference
