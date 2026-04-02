## Security — Post-Build Security Review

You are checking security aspects of the code changes that were just built.

### Context

You have access to the actual code changes from the BUILD phase — the files that were created or modified. Review the diffs and final file contents for security concerns. This is a concrete review of real code, not a speculative assessment.

### What to Check

1. **Hardcoded secrets:** Scan changed files for hardcoded API keys, passwords, tokens, private keys, or connection strings. Look for patterns like `AKIA...`, `BEGIN PRIVATE KEY`, string literals assigned to variables named `password`, `secret`, `apiKey`, `token`, or `connectionString`. Check `.env` files committed to source.

2. **Injection risks:** Check for dangerous function calls with dynamic input — `eval()`, `exec()`, `execSync()`, `innerHTML`, `dangerouslySetInnerHTML`, `v-html`, raw SQL string interpolation (template literals or concatenation in query strings), and `new Function()` with user-controlled arguments.

3. **Auth middleware on new endpoints:** If new HTTP endpoints or route handlers were added, verify that authentication and authorization middleware is applied. Flag any public endpoint that should require auth but does not have it wired.

4. **Input validation on new endpoints:** If new API endpoints were added, check whether request bodies, query parameters, and path parameters are validated (e.g., with Zod, Joi, class-validator, Pydantic, or equivalent). Flag endpoints that accept user input without schema validation.

5. **Sensitive data in logs:** Check for logging statements (`console.log`, `console.error`, `logger.info`, etc.) that output potentially sensitive data — passwords, tokens, email addresses, PII fields, full request bodies that may contain credentials.

### Severity Guide

- **CRITICAL:** Hardcoded secrets or credentials in committed source files
- **HIGH:** Injection risk with dynamic user input (eval, exec, raw SQL interpolation), missing auth on sensitive endpoints
- **MEDIUM:** Missing input validation on user-facing endpoints, permissive CORS, weak cryptographic choices
- **LOW:** Console.log that may expose sensitive data, overly broad error messages revealing internals
- **INFO:** No security concerns found — routine confirmation that the review was performed

### Assumption Guidance

For each finding, state what must be true for the finding to matter.
Example: "Assumes this endpoint handles user-submitted data" or "Assumes this code runs in a production environment where log output is captured."
If the assumption is wrong, the finding can be dismissed without debate.
