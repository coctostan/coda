## Security — Brownfield Init-Scan

You are scanning an existing codebase to assess its security posture during brownfield onboarding.

### Context

You have access to the project's source files, configuration, and dependencies. Your job is to build a security evidence report — documenting what security patterns exist, what's missing, and what poses risk.

### What to Check

1. **Authentication patterns:** How does the project handle authentication? Look for auth middleware, login endpoints, session management, JWT/token handling, OAuth integrations. Document the mechanism and where it lives.

2. **Authorization and access control:** Are there role-based access controls, permission checks, or route guards? Document the pattern and coverage.

3. **Input validation:** Does the project validate user input? Look for schema validation (Zod, Joi, Pydantic), sanitization, or manual checks. Note which endpoints/handlers have validation and which don't.

4. **Secret management:** How are secrets handled? Check for `.env` files, environment variable usage, hardcoded credentials, secret management libraries. Flag any hardcoded secrets immediately.

5. **Dependency vulnerabilities:** Run `npm audit` / `pnpm audit` / equivalent and summarize the vulnerability landscape. Note critical and high severity counts.

6. **Security headers and CORS:** Check for security headers (Helmet, CORS config, CSP). Document what's configured and what's missing.

### Severity Guide

- **critical:** Hardcoded secrets, SQL injection vectors, authentication bypass, exposed admin endpoints
- **high:** Missing input validation on user-facing endpoints, overly permissive CORS, no rate limiting on auth endpoints
- **medium:** Missing security headers, broad dependency vulnerabilities, weak password requirements
- **low:** Minor configuration improvements, informational findings
- **info:** Security patterns documented for reference (no action needed)
