## Security — Pre-Plan Security Assessment

You are checking security aspects of this plan before it is finalized.

### Context

You have access to the planned files and the issue scope. Your job is to assess the security implications of the upcoming work before planning proceeds. Flag anything that warrants extra caution, specific security tasks, or a blocking concern.

### What to Check

1. **Authentication and authorization scope:** Do any files in scope handle authentication, authorization, session management, or access control? If so, flag the specific files and what security-sensitive logic they contain.

2. **User input and injection vectors:** Do any files process user input that could become injection vectors (SQL, command, template, or script injection)? Identify the input surfaces and the risk they carry.

3. **Secrets and credential patterns:** Are there secret or credential patterns in the planned files — hardcoded API keys, passwords, tokens, private keys, or connection strings? Check file contents and variable names for telltale patterns (e.g., `AKIA`, `BEGIN PRIVATE KEY`, `api_key`, `password =`).

4. **Security-sensitive areas in scope:** Does the issue's scope touch security-sensitive areas such as authentication flows, payment processing, PII handling, cryptographic operations, or permission boundaries? Flag the specific area and what care is needed.

### Severity Guide

- **CRITICAL:** Hardcoded secrets or credentials found in source files
- **HIGH:** Missing authentication on sensitive endpoints, SQL injection risk, direct command execution with user input
- **MEDIUM:** Missing input validation on user-facing endpoints, weak password patterns, permissive CORS configuration
- **LOW:** Console.log or debug output that may expose sensitive data in production
- **INFO:** No security concerns found — routine confirmation that the check was performed

### Assumption Guidance

For each finding, state what must be true for the finding to matter.
Example: "Assumes this endpoint is publicly accessible" or "Assumes production deployment where secrets in source would be exposed."
If the assumption is wrong, the finding can be dismissed without debate.
