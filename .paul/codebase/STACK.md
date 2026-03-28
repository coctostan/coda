# Technology Stack

*Generated: 2026-03-28*

## Languages

**Primary:**
- TypeScript — All application code (`packages/*/src/index.ts`)

**Secondary:**
- JSON — Manifests and config (`package.json`, `tsconfig.json`, `packages/*/package.json`)
- Markdown — Specs and documentation (`docs/`, `README.md`, `AGENTS.md`)

## Runtime

- **Bun** — Runtime and test runner (`package.json`, `packages/*/package.json`)
- No `.nvmrc`, `.node-version`, or `engines` field detected
- No `bunfig.toml` configuration

## Package Manager

- **Bun workspaces** — Monorepo declared in `package.json` with `"workspaces": ["packages/*"]`
- No lockfile committed (`bun.lock`, `bun.lockb`, `package-lock.json` — none found)

## Frameworks & Build Tools

- **TypeScript compiler** — `tsconfig.json` with `target: ESNext`, `module: ESNext`, `moduleResolution: bundler`, `strict: true`, `declaration: true`
- No web frameworks detected (no React, Vue, Express, etc.)
- No bundler config detected (no Vite, webpack, tsup, etc.)
- No build script defined in `package.json`

## Dependencies

### Internal (workspace)
- `@coda/core` — Shared infrastructure, depended on by all extension packages (`packages/coda/package.json`, `packages/muse/package.json`, `packages/lens/package.json`, `packages/helm/package.json`)

### Dev Dependencies (per package)
- `typescript: 5.8` — All packages
- `@types/bun: latest` — All packages

### Peer Dependencies (extension packages)
- `@mariozechner/pi-ai: *`
- `@mariozechner/pi-agent-core: *`
- `@mariozechner/pi-coding-agent: *`
- `@mariozechner/pi-tui: *` (coda only)

### Production Dependencies
- None declared yet

## Configuration

- Root TypeScript config: `tsconfig.json`
- Pi settings: `.pi/settings.json`
- Module prompts (planned): `modules/prompts/` (empty)
- Module evals (planned): `modules/evals/` (empty)
- No `.env` files or environment variable usage detected

## Platform

- **Pi coding agent** — Extension platform for all application packages
- Target: CLI-based AI-assisted development workflow

---
*STACK.md — technology and dependency snapshot*
