# Roadmap and status

## Phase 3 — current implementation and Phase 4 prerequisites

Organizations, properties and scoped invitations are implemented and locally verified. See [Phase 3 report](18-phase3-report.md) for authorization, lifecycle, schema and test evidence. PostCSS is now 8.5.29; other stable pins and compiler peer exceptions remain as recorded below.

Before Phase 4, define room/unit/bed semantics, capacity, status transitions, archive behavior and occupancy lifecycle for each supported property type from the next user request. Types are immutable; currency is INR; country defaults to IN; nullable property timezone inherits the organization. Hotel configurations use check-in/out times; rental types use due day 1–28 and grace days 0–31.

L1 occupancy/unit modules must import property contracts through index.ts, validate property ownership with organization-leading composite foreign keys and enforce can(user, permission, {propertyId}) in every service. Reuse cursor pagination and the repository reflection harness for every method. Switcher cookies are filters only. Refresh stable versions before implementation, apply migrations before API/workers and preserve legacy PostgreSQL volumes. The L0 property-directory port keeps identity and invitation modules below properties without upward imports.

Reuse after-commit property.created, property.archived and invitation.accepted events when later listeners are specified; delivery is not a durable outbox. Billing, KYC, lease membership and production operational review remain future prerequisites. The current audit blockers and unverified deployment/security/Hindi/visual checks are listed in the report. Historical sections below describe their original phase, not current behavior.

## Phase 2 - historical implementation and verification

Authentication, self-service registration, RBAC, encrypted queued emails and the bilingual client flows are implemented. See [Phase 2 report](17-phase2-report.md) for the contract, operational setup and current verification evidence. Historical sections below retain their original results; future domain pages remain placeholders.

## Stable upgrade - current (2026-10-05)

Latest user authorization replaces the old Node 20/PostgreSQL 16/Redis 7/Next 14/Yarn 1 pins. Current baseline: Node 26.10.0, PostgreSQL 18.6, Redis 8.10.2, Nest 12.1.2, TypeORM 1.1.1, Next 16.3.8, React 19.3.0, Tailwind 4.3.3 and Yarn 4.18.1. All direct packages use exact non-prerelease versions; compiler compatibility exceptions are documented. Both verification suites pass; audits still block release on transitive tooling findings. See [stable upgrade report](16-stable-upgrade-report.md). Earlier sections below are historical results, not the current pins or audit counts.

## Phase 1 - historical baseline

Implemented the NestJS/PostgreSQL/Redis/BullMQ foundation, tenant-scoped adapters and isolation harness, localized HTTP/security/logging platform, migrations, health/readiness, worker entrypoint, OpenAPI export, non-root Docker targets and canonical module/integration placeholders.

The client includes the bilingual animated landing page, light/dark primitives, reduced-motion helpers, admin/tenant/auth shells and all requested route placeholders, injected HTTP/health APIs, disabled refresh scaffold, query policies and generated contracts.

Both repositories passed yarn verify on 2026-10-03: server 18 unit + 6 HTTP e2e + 3 real PostgreSQL/Redis integration tests; client 13 tests and production build. Gate proofs passed: server 42, client 31. The server Compose stack is running, readiness returns 200, API/worker run as UID 1000, and three API replicas are healthy behind Nginx. English/Hindi client HTML smoke checks return 200 with matching lang attributes and nonce CSP.

See [Phase 1 report](15-phase1-report.md) for commands, tree, decisions and current verification limitations. Phase 0 details below are historical, not the current infrastructure status.

Historical Phase 1 release blockers: audit findings (server 11 high; client 2 low, 11 moderate, 11 high, 2 critical dependency paths). Requested Next.js 14 remains pinned; do not waive audits. Remote CI/CodeQL/Gitleaks, browser visual/contrast review, production Docker target and the client container build are not yet verified. Browser automation initialization failed; client Docker package downloads repeatedly stalled. All Hindi catalogs need human review. Authentication/verified tenant identity and business authorization are Phase 2 work; navigation permissions are previews.

Decisions: retain TypeORM 0.3 and Nest EventEmitter 3 for this CommonJS/Jest platform; expose tenant pages under /tenant/* to avoid App Router collisions; run migrations as a single service before scaling API; use a non-root Nginx proxy with Docker DNS resolution for three replicas. No business handlers or endpoints are invented.

## Historical Phase 0 record

## Phase 0

Implemented: engineering charter, pointer checks, ESLint 9, architecture/localization gates, generators, hooks, CI and minimal bilingual applications. Both repositories passed yarn verify:quick on 2026-10-03. See [verification report](14-phase0-report.md).

## Decisions made

- The latest Phase 0 request supersedes the earlier M0-M9 scope and intervening Prisma/Biome/Next 15 scaffold. Existing work was preserved in snapshot commits; this phase uses NestJS, ESLint 9 and Next.js 14.
- Preserve the existing legacy tags/reset history; use phase/0-charter without repeating the destructive reset.
- Pin Node 20.20.2 and Yarn 1.22.22. The workspace portable Node binary was checked against the official SHA256.
- Preserve local environment/npm files without reading their contents in ../.rentmate-legacy-env. Preserve old dependency caches outside the repositories.
- No Postgres/Redis, authentication, tenant repositories or business features are implemented in Phase 0. Server test:int/test:e2e explicitly fail until real infrastructure suites exist.
- Keep /health/live outside the future business response envelope for health probes; its exact shape is exported in OpenAPI and generated client types.
- Resolve English/Hindi preferences without locale URL prefixes. NEXT_LOCALE stores only a non-sensitive preference; user/org sources arrive with authentication.
- Pin nestjs-i18n 10.5.0 and jest-dom 6.9.1 for Node 20 compatibility. Patch available cookie, YAML, PostCSS and Vitest advisories; keep audit failures visible.
- Keep the explicitly requested Next.js 14.2.35. Current critical advisories require Next >=15.5.24, so release is blocked pending a supported-framework decision. Do not waive audits.
- Windows SWC requires a private native cache under the user profile; use SWC_NATIVE_BINDING_CACHE. Only that new directory received a protected ACL. No integrity checks were disabled.
- Use a 60-second Jest test budget for real Nest startup on Windows; the previous 5-second budget timed out under concurrent builds.
- Client development/start scripts bind loopback on port 3001. Smoke testing used 3002 because another process occupied 3001.

## Known gaps

Dependency audits fail: server 11 high findings (one unpatched braces advisory across tooling paths); client 2 low, 11 moderate, 11 high and 2 critical findings (Next and braces). Counts are dependency paths, not unique advisories.
Docker daemon was unavailable; Postgres/Redis, scaling and DB-dependent tests were not verified. Remote CI, CodeQL and Gitleaks were configured but not executed. Hindi needs human review before production use.
The Next standalone output needs its generated server entrypoint and copied public/static assets for packaged deployment; yarn start is the local smoke command.

## Next phases

Implement platform/database/tenancy foundations before domain features. Resolve supported property types, occupancy/unit/bed semantics, billing dates/proration/GST, KYC policy, lease membership and organization onboarding before domain schema design.
