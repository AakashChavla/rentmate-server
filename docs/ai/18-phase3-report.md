# Phase 3 report — organizations, properties and invitations

Implemented on phase/3-organizations-properties from phase/2-auth-registration-rbac in both repositories. Local commits are authorized; no push or history rewrite is performed.

## Server behavior

Organization GET/PATCH supports name, timezone, default locale and bounded JSON settings. Organization cache versions invalidate all warm authorization contexts after settings and onboarding changes.

Properties support tenant-scoped CRUD, soft deletion, archiving, cursor pagination, type/status/search filters and mine=true. PROPERTY grants restrict every service operation through PermissionChecker.can with propertyId; an organization grant permits its organization. Client propertyId is an additional filter and never grants access. Composite foreign keys and organization-leading indexes enforce ownership for properties, configurations, invitations and scoped assignments. Repository reflection checks cover every new public method.

Property types are HOTEL, PG_HOSTEL, APARTMENT_COMPLEX and INDIVIDUAL_FLAT. Type is immutable after creation. Country defaults to IN and currency is the INR constant. A null timezone override inherits the organization timezone. Strict per-type Zod schemas validate hotel check-in/out times and rental due day (1–28) and grace days (0–31). Configuration PATCH validates a partial schema and atomically merges JSONB without resetting omitted values or losing concurrent updates.

Invitations use a random 32-byte token, SHA256 storage, a seven-day TTL and a locale snapshot. Public acceptance hashes the password before token lookup, performs a fixed-length native constant-time digest comparison (including a dummy comparison for unknown tokens), and uses strict shared Redis throttling. Origin checks remain required. Transaction locks enforce single use, resend rotation and revocation; database uniqueness resolves simultaneous account creation across organizations. Existing accounts are rejected. Owners alone can invite owners, owner grants are organization scoped, and SUPER_ADMIN cannot be invited.

Acceptance creates an ACTIVE verified user and the invited role/scope, then returns success and role-directed login information. It does not create a session. Lifecycle HTTP tests prove acceptance followed by login. Localized invitation emails use encrypted queued payloads and the configured client origin. Real SMTP fixture tests cover both locales and token lifetime. property.created, property.archived and invitation.accepted publish after commit; later listeners and durable event delivery are future work.

## Client behavior

The client includes the onboarding progress ring, filtered property grid, type-specific create/edit wizard, overview/settings/team tabs, archive confirmation, organization settings, scoped team invitations, resend/revoke history and public invitation acceptance. The top-bar switcher reads mine=true, stores only a preference cookie and passes selection as a filter. Scoped managers can navigate property/team pages while organization-wide user and organization settings pages require organization grants. All actions retain server authorization. Forms and states are localized in English and Hindi, with reduced-motion behavior and automated accessibility checks.

Server OpenAPI is exported before client api:types; client inputs use generated partial configuration and nullable timezone contracts. HTTP adapters and service/repository integrations retain abstract ports and root bindings. The L0 OrganizationPropertyDirectory port is implemented by the L1 property repository without an upward module import.

## Verification and limits

Server yarn verify passes: 55 unit, 33 HTTP and 18 real database integration tests. Client yarn verify passes: 48 tests and the production build. Tests cover foreign-organization access across endpoints, property-only managers, invitation expiry/reuse/revoke/rotation, duplicate and concurrent acceptance, malformed tokens, per-type configuration, partial update races, wizard/edit/archive/switcher flows, scoped assignment, hidden actions and accessibility. The migrated database produces an EMPTY entity migration diff.

Gate mutation proofs pass: server 42 and client 31. Verification uses only the isolated PostgreSQL 18.6/Redis 8.10.2 fixture on ports 25432/26379. Legacy database volumes are preserved. The fixture SMTP check is not production SMTP validation.

The current stable registry check covered 95 direct dependencies. Node 26.10.0, PostgreSQL 18.6 and Redis 8.10.2 remain the selected non-prerelease releases. PostCSS is updated to 8.5.29. TypeScript remains server 6.0.3/client 5.9.3 because current compiler consumers reject TypeScript 7; see [compiler exceptions](16-stable-upgrade-report.md). No peer or audit gate is bypassed.

Audits still block release on one high upstream braces advisory in each repository and one moderate deprecated glob advisory on the server. Remote CI, CodeQL/Gitleaks, production HTTPS/cookie deployment, production SMTP and browser visual/contrast review were not executed in this phase. Assistant-authored Hindi requires human review. Passing local checks does not establish production readiness.

## Phase 4 prerequisites

See [roadmap and prerequisites](10-roadmap-and-status.md). Units, rooms, beds and occupancy require the next phase's explicit domain rules before schema implementation. Reuse property scope checks, composite ownership constraints, reflection fixtures and generated API contracts; no client preference may become authorization authority.
