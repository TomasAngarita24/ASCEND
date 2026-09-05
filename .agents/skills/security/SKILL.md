---
name: security
description: Reviews and implements software securely, focusing on authentication, authorization, validation, secrets, injection, data exposure, dependencies, and common application vulnerabilities. Use whenever code handles users, credentials, external input, APIs, databases, files, or sensitive data.
---

# Security

## Goal
Prevent security vulnerabilities while preserving the requested functionality.

## Rules
- Treat external input as untrusted.
- Validate input at appropriate boundaries.
- Enforce authentication and authorization separately.
- Apply least privilege.
- Never hardcode passwords, API keys, tokens, private keys, or secrets.
- Use environment variables or the project's secure secret mechanism.
- Never log credentials, tokens, session identifiers, or sensitive personal data.
- Avoid SQL injection by using parameterized queries or the project's safe ORM mechanisms.
- Prevent XSS through contextual output encoding and safe rendering.
- Apply CSRF protection where applicable.
- Protect sensitive files and endpoints with explicit authorization.
- Use secure password hashing mechanisms provided by the project's ecosystem.
- Do not weaken TLS, authentication, authorization, validation, or security headers merely to make development easier.
- Avoid exposing stack traces or internal implementation details to users.
- Consider path traversal, command injection, SSRF, insecure deserialization, and unsafe file handling when relevant.
- Review new dependencies for unnecessary attack surface when practical.
- Preserve secure defaults.

## When fixing a vulnerability
1. Reproduce or understand the vulnerable path.
2. Identify the root cause.
3. Apply the smallest robust fix.
4. Add a regression test when practical.
5. Check for similar vulnerable patterns nearby.

## Comments
Use minimal comments. Explain security rationale only when it is not obvious from the code.
