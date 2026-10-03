# Security and logging

Validate inputs using DTOs/Zod; whitelist and reject unknown input. Secrets are never read, printed, committed or logged. Startup rejects short/placeholder secrets when secrets are introduced. Argon2id and signed, issuer/audience-pinned JWTs are the auth requirements for the next phase.
Only verified JWTs establish organization scope. Auth cookies are httpOnly, SameSite and Secure in production; unsafe requests verify Origin. Never put tokens in JavaScript or localStorage. Rate-limit all public business endpoints when authentication is added.
Use Pino with request IDs, redact authorization/cookie/set-cookie/password/token/code fields and mask PII. Never leak internals in 5xx. The client sets nonce-based CSP and forbids dangerouslySetInnerHTML.
CI runs dependency audit, Gitleaks and CodeQL; Dependabot maintains dependency alerts. Run outbound URLs through SSRF checks, validate upload magic bytes and sizes, use random private keys and signed URLs when those features are built.
Security event catalog planned: auth.login.success/failure/locked, auth.refresh.reuse_detected, auth.session.revoked, auth.password.changed/reset, auth.otp.sent/failed/locked, user.suspended/role_assigned/role_removed. No event implementation is claimed in Phase 0.
