# Security and logging

DTO/Zod validation rejects unknown fields. Argon2id, HS256 pinned issuer/audiences, independent secrets of at least 32 characters, httpOnly cookies and Origin checks are implemented. JWT user/org claims establish tenant identity. Redis enforces lockouts, OTP attempt budgets, revocation markers and cached permission contexts. No tokens enter response bodies, client storage or logs.

SecurityEventLogger emits a fixed catalog event field, user/org/request IDs where available and masked email addresses. Pino redacts authorization, cookie, set-cookie, password, token and code fields. Internal failures map to localized error codes.

Implemented event catalog: auth.login.success, auth.login.failure, auth.login.locked, auth.refresh.reuse_detected, auth.session.revoked, auth.password.changed, auth.password.reset, auth.otp.sent, auth.otp.failed, auth.otp.locked, auth.register.created, auth.register.verified, user.suspended, user.role_assigned and user.role_removed. Event names live in shared/identity.constants.ts.

Email jobs contain AES-GCM ciphertext with a five-minute expiry. ExternalCallPolicy applies a deadline and typed infrastructure failures; SMTP IO also has connection/socket timeouts. BullMQ supplies bounded retries and retention. SMTP host is a validated administrator-controlled configuration value; recipient input cannot choose transport URLs or hosts. User-controlled outbound URLs/uploads require separate SSRF and content validation when introduced.

CI configures dependency audit, Gitleaks and CodeQL; remote runs remain unverified. Upstream audit findings still block release. Review [Phase 2 report](17-phase2-report.md) and [refresh ADR](../adr/0007-atomic-refresh-rotation.md) for limitations, production setup and transaction/Redis boundaries.
