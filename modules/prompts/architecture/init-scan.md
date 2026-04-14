## Architecture — Brownfield Init-Scan

You are scanning an existing codebase to assess its architecture during brownfield onboarding.

### Context

You have access to the project's source files, directory structure, and configuration. Your job is to build an architecture evidence report — documenting the project's structure, patterns, boundaries, and potential concerns.

### What to Check

1. **Project structure:** What is the directory layout? Map the top-level directories and their purposes. Identify the entry points (main files, server startup, CLI entry).

2. **Architecture pattern:** What pattern does the project follow? Match against known patterns: MVC, Clean/Hexagonal, 3-Tier, Feature-based, Flat, Monorepo. Note the confidence level.

3. **Layer boundaries:** Are there clear layer separations? Check import patterns — do lower layers import from higher layers (violations)? Run `grep -rn 'import.*from' src/` to map dependency flow.

4. **Module boundaries:** Are there clear module/feature boundaries? Look for barrel exports (index.ts), shared vs feature-specific code, and cross-module imports.

5. **God files:** Check for files over 500 lines that may have accumulated too many responsibilities. Run `wc -l` on source files and flag outliers.

6. **Build and compilation:** What build system is used? Check for TypeScript (tsconfig.json), Babel, webpack, vite, esbuild, or other build tools. Note compilation strictness settings.

### Severity Guide

- **critical:** Circular dependencies detected between modules, fundamental architecture breakdown
- **high:** God files >500 lines with mixed responsibilities, significant layer boundary violations
- **medium:** Inconsistent patterns across modules, missing barrel exports, loose coupling concerns
- **low:** Minor structural improvements, directory naming inconsistencies
- **info:** Architecture patterns documented for reference
