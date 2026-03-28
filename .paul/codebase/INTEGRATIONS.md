# External Integrations

*Generated: 2026-03-28*

## Pi Extension Platform

The primary integration surface. All extension packages declare peer dependencies on:

- `@mariozechner/pi-ai` — AI model access (`packages/coda/package.json`, `packages/muse/package.json`, `packages/lens/package.json`, `packages/helm/package.json`)
- `@mariozechner/pi-agent-core` — Agent lifecycle and hooks
- `@mariozechner/pi-coding-agent` — Coding agent harness
- `@mariozechner/pi-tui` — Terminal UI components (`packages/coda/package.json` only)

### Planned Hook Integration
Documented in `docs/v0.1/07-pi-integration.md` and `docs/coda-spec-v7.md`:
- `before_agent_start` — Inject phase context
- `tool_call` — Intercept tool calls for write-gate enforcement
- `agent_end` — Mark task/phase completion
- `newSession` / `sendUserMessage` — Session lifecycle

**Status:** Documented only. No implementation exists yet.

## External APIs & Services

Not detected in source code. The following are mentioned in planning docs only:

- Databases (Postgres, MongoDB) — `docs/module-gaps-and-onboarding.md`
- Cache (Redis) — `docs/module-gaps-and-onboarding.md`
- Authentication (OAuth, SAML, API keys) — `docs/coda-spec-v7.md`
- Email (SendGrid) — `docs/module-gaps-and-onboarding.md`
- Version control (GitHub sync) — `docs/module-gaps-and-onboarding.md`
- Notifications (Telegram, Discord) — `docs/module-gaps-and-onboarding.md`
- Payment/cloud (Stripe, AWS SDK) — `docs/module-gaps-and-onboarding.md`

**Status:** Planning-stage references, not implemented.

## Third-Party Tools

- No linter integration (ESLint, Prettier not configured)
- No CI/CD integration detected
- No monitoring or analytics tools detected

## Configuration Surface

- No `.env` files or `dotenv` usage
- No API client libraries (`fetch`, `axios`, etc.) in source
- Future config planned at `.coda/coda.json` per `docs/coda-spec-v7.md`

---
*INTEGRATIONS.md — external service and platform integration map*
