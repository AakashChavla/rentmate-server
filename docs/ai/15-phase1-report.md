# Phase 1 foundation verification - 2026-10-03

## Branches and scope

Both repositories use phase/1-foundation created from phase/0-charter. Conventional commits are local; nothing was pushed, amended or rewritten. Legacy snapshots/tags and environment backups remain intact. Scope follows the user Phase 1 request. Authentication, tenant identity guards and rental workflows are deliberately future-phase capabilities, with localized placeholders only.

## Commands and observed results

- Corepack Yarn 1.22.22 on Node 20.20.2; frozen dependency installs completed.
- Server yarn verify: passed lint, strict types, dependency boundaries, pointer checks, auth-escape policy, localization parity/usage, 10 unit suites/18 tests, 6 Nest HTTP e2e tests, compilation, and 2 infrastructure suites/3 tests against real PostgreSQL 16/Redis 7.
- Server yarn openapi:export followed by client yarn api:types: passed; checked-in contracts contain only real health probes. Business envelope helpers are exercised by test-only routes and do not invent product endpoints.
- Client yarn verify: passed strict gates, 7 suites/13 tests and Next.js production build. The final rerun passed all gates, 13 tests and the production build after adding validated pagination metadata preservation.
- yarn rules:proof: server 42 and client 31 temporary violations rejected; fixtures removed. New server auth escape usage is rejected outside auth repositories/tests; unused variable rejection is included. Existing lint, architecture, module-layer, localization and pointer fixtures remain enforced.
- Server docker compose -p rentmate-foundation up -d --build produced non-root dev images. A slow image unpack was interrupted; startup with --no-build subsequently completed. PostgreSQL/Redis healthchecks passed, migration service exited successfully, API/worker/proxy started. GET http://127.0.0.1:13000/health/ready returned 200 with postgres:true/redis:true and X-Request-ID. API/worker id -u returned 1000.
- docker compose up -d --no-build --scale api=3: all three API replicas healthy. Nginx resolves API addresses dynamically; migrations remain a one-shot dependency rather than running in every replica.
- Local built client on http://127.0.0.1:13001 returns English and Hindi HTML with status 200, matching lang, nonce CSP and /register CTA. RTL verifies language cookie persistence/router refresh, theme/shell rendering, reduced-motion policy and both landing locales. Browser automation could not initialize: runtime reported missing kernel asset path.
- Docker Compose configuration validation: passed for the workspace include file. Fixture ports: PostgreSQL 15432, Redis 16379; the initial API proxy proof used 13000 and final startup moved it to 3000 to match the built client. Default ports remain 5432/6379/3000/3001 and are configurable.
- yarn audit --json: server 11 high; client 2 low, 11 moderate, 11 high, 2 critical findings, counted by dependency path. Audit gates remain failing. Reports are in workspace .rentmate-tools/phase1-*-audit.jsonl; no real secrets were read or logged.

## Decisions and limitations

TypeORM 0.3 and @nestjs/event-emitter 3 preserve CommonJS/Jest compatibility; newer ESM majors were incompatible with the chosen runtime. TenantScopedRepository composes a low-level adapter, explicitly requires organizationId, stamps inserts and scopes updates; raw manager access stays in the infrastructure adapter boundary. Nested transactions join ALS and propagate rollback-only even when a nested failure is caught. Reflection tests reject missing repository-method isolation cases.

Redis counters use one atomic script with first-write expiry. BullMQ publishers/worker registration share five attempts, exponential backoff and bounded retention; no fake business consumer is registered. Shutdown closes registered workers, publishers, Redis and PostgreSQL. Origin protection applies only to unsafe cookie-auth requests. Swagger defaults off in production. Pino masks headers/credentials, omits query strings and suppresses internal exception details.

Client tenant routes use /tenant/* because route groups do not change URLs. Shell permission filtering is a preview; Phase 2 must enforce permissions and verified JWT organization identity server-side. Refresh remains disabled. The running API now uses port 3000 to match the built preview API URL; rebuild with NEXT_PUBLIC_API_URL matching any overridden proxy port. CORS must list the matching client origin.

Client Docker build failed fetching lucide-react-0.468.0.tgz from registry.npmjs.org with ESOCKETTIMEDOUT; its image/runtime remain unverified pending network recovery. Production server Docker target has not been built. The Dockerfile ownership optimization avoids a full recursive chown layer; startup proof used the preceding equivalent non-root dev image. Remote GitHub CI, CodeQL and Gitleaks were configured but not executed. Browser screenshots, actual browser reduced-motion interaction and AA contrast were not verified; jsdom axe smoke excludes color contrast. Hindi is assistant-authored and requires review. Next.js 14 advisories and unpatched braces tooling findings block release; no audit exception was introduced.

Logs are in the ignored workspace .rentmate-tools directory. Temporary fixture database credentials exist only in this local proof environment/isolated CI. Do not run integration tests against production. Sample tables and Redis fixture keys are removed by the tests; database volumes remain for local development.

## Repository tree (depth 3)

```text
.env.example
AGENTS.md
CLAUDE.md
docker-compose.yml
docker/nginx.conf
Dockerfile
docs/adr/0001-charter-and-ports.md
docs/adr/0002-locales-and-ui.md
docs/adr/0002-phase1-foundation.md
docs/ai/01-architecture.md
docs/ai/02-code-style-and-naming.md
docs/ai/03-data-access-and-tenancy.md
docs/ai/04-integrations.md
docs/ai/05-api-conventions.md
docs/ai/06-testing.md
docs/ai/07-security-and-logging.md
docs/ai/08-git-and-workflow.md
docs/ai/09-review-checklist.md
docs/ai/10-roadmap-and-status.md
docs/ai/11-reusable-catalog.md
docs/ai/12-localization.md
docs/ai/14-phase0-report.md
docs/ai/15-phase1-report.md
docs/openapi.json
eslint.config.mjs
GEMINI.md
jest.config.cjs
jest.e2e.config.cjs
jest.int.config.cjs
package.json
README.md
src/app.module.ts
src/bootstrap.ts
src/core/config/
src/core/context/
src/core/core.module.ts
src/core/database/
src/core/errors/
src/core/events/
src/core/health/
src/core/http/
src/core/i18n/
src/core/ids/
src/core/lifecycle/
src/core/logger/
src/core/queue/
src/core/README.md
src/core/redis/
src/core/tenancy/
src/core/time/
src/i18n/en/
src/i18n/hi/
src/integrations/email/
src/integrations/fcm/
src/integrations/payments/
src/integrations/README.md
src/integrations/sms/
src/integrations/storage/
src/integrations/whatsapp/
src/main.ts
src/modules/audit/
src/modules/auth/
src/modules/authorization/
src/modules/beds/
src/modules/complaints/
src/modules/dashboard/
src/modules/documents/
src/modules/expenses/
src/modules/invoices/
src/modules/kyc/
src/modules/leases/
src/modules/maintenance/
src/modules/notifications/
src/modules/occupancy/
src/modules/organizations/
src/modules/payments/
src/modules/properties/
src/modules/README.md
src/modules/reports/
src/modules/templates/
src/modules/tenants/
src/modules/units/
src/modules/users/
src/modules/utilities/
src/modules/visitors/
src/shared/cursor.spec.ts
src/shared/cursor.ts
src/shared/duration.constants.ts
src/shared/duration.ts
src/shared/locale.constants.ts
src/shared/locale.spec.ts
src/shared/locale.ts
src/shared/message-key.ts
src/shared/pagination.constants.ts
src/shared/README.md
src/test/e2e/
src/test/fakes/
src/test/int/
src/worker.ts
tools/architecture-fixtures.ts
tools/auth-scope-policy.ts
tools/catalog-utils.ts
tools/check-auth-scope.ts
tools/check-i18n.ts
tools/check-rules.ts
tools/codegen/plopfile.cjs
tools/codegen/templates/
tools/copy-catalogs.cjs
tools/file-utils.ts
tools/generate-i18n.ts
tools/jest-env.cjs
tools/migrate.ts
tools/openapi-export.ts
tools/proof-architecture.ts
tools/proof-auth-scope.ts
tools/proof-fixtures.ts
tools/proof-i18n.ts
tools/proof-lint.ts
tools/proof-pointers.ts
tools/proof-utils.ts
tools/prove-rules.ts
tools/translation-usage.ts
tsconfig.build.json
tsconfig.json
```
