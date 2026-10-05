# Phase 2: authentication, registration and RBAC

Implemented on phase/2-auth-registration-rbac in both repositories, preserving Phase 1 and the compatible stable upgrade. Nothing is pushed. Node 26.10.0, PostgreSQL 18.6, Redis 8.10.2, Nest 12.1.2, TypeORM 1.1.1, Next 16.3.8 and React 19.3.0 remain pinned. New server packages: Argon2 0.45.1, jose 6.2.12 and Nodemailer 10.0.14.

## Delivered

Four acyclic L0 capabilities: organizations, users, authorization and auth. Root wiring binds abstract ports with useClass; module indices expose contracts and DTOs. Tenant repositories enforce scoped reads/writes and composite foreign keys; email lookup is restricted to the auth repository. User mutations are targeted updates.

Atomic registration creates an inactive organization, pending owner, organization role assignment and two versioned consents. OTP verification activates the account and starts an httpOnly cookie session. Existing-email registration creates nothing and sends a localized account-exists email with the same neutral response. Password/OTP login, reset/change, suspension, immediate session revocation, scope-aware authorization, last-owner locking and keyset user pagination are implemented.

Argon2id uses full production settings and test-only lighter settings. JWT algorithm/issuer/audience checks are pinned. Redis handles lockouts, atomic OTP attempt budgets, session markers and the single 15-minute permission context cache. Origin protection covers public unsafe authentication requests as well as cookie-authenticated writes. Public authentication endpoints use 10/minute IP and email limits; me/refresh/logout use 60/minute limits.

The bilingual client includes the four-step animated signup wizard, password and OTP login, password recovery, profile/locale/password editing, authenticated shells and logout menus. AuthProvider uses a five-minute identity query; transport refresh is single-flight and excludes auth endpoints. Navigation and row actions enforce permissions; the users screen has debounced filtering, infinite pagination, edit and organization-role dialogs. Property scope and first-property creation remain disabled until Phase 3.

## HTTP contract

All business paths below have prefix /api/v1 and use the common success/error envelope, request ID and locale handling. Tokens never appear in bodies.

| Method | Path                                                         | Authorization                                          |
| ------ | ------------------------------------------------------------ | ------------------------------------------------------ |
| POST   | /auth/register, /auth/register/verify, /auth/register/resend | Public, throttled                                      |
| POST   | /auth/login, /auth/otp/send, /auth/otp/verify                | Public, throttled                                      |
| POST   | /auth/password/forgot, /auth/password/reset                  | Public, throttled                                      |
| POST   | /auth/refresh, /auth/logout                                  | Verified refresh cookie                                |
| GET    | /auth/me                                                     | Any authenticated                                      |
| POST   | /auth/password/change                                        | Any authenticated                                      |
| PATCH  | /users/me                                                    | Any authenticated                                      |
| GET    | /users, /users/:id                                           | user:read                                              |
| PATCH  | /users/:id                                                   | user:update; self-suspension and last-owner protection |
| POST   | /users/:id/roles                                             | role:assign plus active organization owner             |
| DELETE | /users/:id/roles/:assignmentId                               | role:assign plus active organization owner             |
| GET    | /roles, /permissions                                         | role:read                                              |

Important error codes: INVALID_CREDENTIALS, ACCOUNT_SUSPENDED, TOO_MANY_ATTEMPTS, RATE_LIMITED, SESSION_REVOKED, TOKEN_ROTATED, OTP_INVALID, OTP_EXPIRED, OTP_LOCKED, WEAK_PASSWORD, LAST_OWNER, NOT_SUPPORTED_YET, FORBIDDEN, UNAUTHORIZED, NOT_FOUND, INVALID_CURSOR and CSRF_ORIGIN_MISMATCH. The client maps these to en/hi catalogs and displays live retry countdowns and request IDs.

## Running and seeds

Supply three independent random secrets of at least 32 characters: JWT_ACCESS_SECRET, JWT_REFRESH_SECRET and OTP_HMAC_SECRET. Placeholder values are rejected. API and worker must share the same values. Configure DB/Redis and an administrator-selected SMTP_HOST/PORT/SECURE, EMAIL_FROM and optional SMTP credentials. Run yarn migration:run, yarn seed, yarn dev and yarn worker:dev. SMTP delivery is bounded by ExternalCallPolicy and Nodemailer socket timeouts; BullMQ retries five times with backoff. Recipient/code payloads are AES-GCM encrypted and expire after five minutes. The stable registration.cleanup scheduler runs hourly and removes only inactive, pending registrations older than 72 hours.

Platform account: PLATFORM_ADMIN_EMAIL and PLATFORM_ADMIN_PASSWORD seed a SUPER_ADMIN in the platform organization. Development-only DEMO_SEED_PASSWORD seeds demo users: org_owner@demo.rentmate.test, property_manager@demo.rentmate.test, accountant@demo.rentmate.test, receptionist@demo.rentmate.test, maintenance_staff@demo.rentmate.test, security_staff@demo.rentmate.test and tenant@demo.rentmate.test. Their password is the value supplied by the operator; no credentials are committed or printed. Repeated seeds retain existing accounts and passwords.

rm_access uses path /; rm_refresh uses /api/v1/auth; rm_session is an httpOnly constant hint on /. Development cookies are Lax; production cookies are Secure and Strict. Set COOKIE_DOMAIN only when API and client need a shared parent domain. Production requires HTTPS. The hint only controls routing; JWT verification establishes identity.

## Decisions and limitations

[ADR 0007](../adr/0007-atomic-refresh-rotation.md) explains conditional rotation, grace responses and after-commit effects. Explicit ValidatedBody/ValidatedQuery decorators preserve validation and Swagger models when tsx does not emit decorator metadata. The dashboard shell is accessible to all authenticated staff; future report data requires report permissions. Role, status and error labels are localized.

The terms/privacy checkboxes use version 2026-10-05; owner-approved legal documents and all assistant-authored Hindi require review before production. Production SMTP credentials/deliverability, production HTTPS/domain integration, remote CI/CodeQL/Gitleaks and browser visual/contrast review remain unverified. Existing upstream dependency audit findings remain release blockers and are not suppressed. Property/tenant record ownership, invitations and domain features belong to subsequent phases.

## Verification evidence

Both repositories passed yarn verify on 2026-10-05. Server: 42 unit tests, 17 HTTP tests and 14 real PostgreSQL/Redis integration tests; client: 27 tests and a production build generating 32 routes. Static checks passed for lint, strict types, architecture, documentation, auth scope and localization. Server rule proofs rejected 42 temporary violations; client proofs rejected 31, and all fixtures were restored.

Applied migrations match entity metadata: yarn migration:generate reports EMPTY. The final server OpenAPI document was exported, then client API types were regenerated. The seed fixture ran twice: eight accounts retained their identities, password hashes and one role assignment each. Test credentials were generated for the isolated fixture and were not printed.

Real PostgreSQL/Redis HTTP tests cover signup, cookies, Origin checks, IDOR, warm authorization with zero database queries, password recovery and immediate revocation. Race tests prove one successor from 20 parallel refreshes, bounded comparisons for 50 OTP guesses and one remaining active owner after simultaneous removal attempts. Reflection tests enumerate every new repository method; transaction rollback, guarded registration retention and microsecond-precision keyset pagination pass. Local SMTP tests deliver English/Hindi mail, reject tampering, ignore expired codes and deliver through the real BullMQ worker with its stable cleanup scheduler. Client checks cover refresh coalescing, expiry cache clearing, redirects, permissions, wizard flow, error countdowns, OTP accessibility and user filtering.

Dependency audit remains failing: one high braces advisory (GHSA-vfj7-8cjw-p6xm) in each repository; the server also reports a moderate deprecated glob dependency. These are upstream transitive findings, not waived or suppressed. Production SMTP/HTTPS/domain behavior, remote CI/security scanning, browser visual/contrast review and human Hindi/legal review remain unverified as listed above.
