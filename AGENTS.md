# RentMate Server Engineering Rules (AGENTS.md)

This document is the canonical single source of truth for engineering standards in `rentmate-server`. All AI assistants (Claude Code, Cursor, Copilot, Antigravity) and developers MUST follow these rules. Detailed guides live in `docs/ai/` and ADRs in `docs/adr/`.

---

## 1. Project Flow & Architecture
- **Vertical Slices**: Every phase ships DB schema + API + tests + background jobs + frontend together. Never build all schemas first.
- **Phases**: 1 Foundation, 2 Auth+RBAC, 3 Organizations+Properties, 4 Units+Occupancy, 5 Tenants+Leases, 6 Billing+Invoices, 7 Payments, 8 Complaints+Maintenance, 9 Visitors, 10 Notifications, 11 Reports+Dashboard, 12 Security+Audit, 13 Performance+Hardening, 14 Production Deployment. Phases 1-2 DONE; Phase 3 NEXT. Do not start a phase until previous phase's "Done When" is verified.
- **Layering Order**: L0 (Auth, Authz, Orgs, Users) -> L1 (Properties, Units, Beds, Occupancy) -> L2 (Tenants, Docs, KYC) -> L3 (Leases) -> L4 (Invoices, Payments, Expenses, Utilities) -> L5 (Complaints, Maintenance, Visitors) -> L6 (Notifications, Templates) -> L7 (Reports, Dashboard, Audit).
- **Module Dependencies**: Modules depend only on same or lower layers. Upward communication ONLY via domain events (`@nestjs/event-emitter`). No cycles.
- **Platform Layer**: `core/`, `shared/`, `integrations/` live below L0 and NEVER import from `modules/`. Transactional system messaging (OTP, invites) lives in `core/notifications`.
- **Open Product Questions**: Never invent product decisions. Reference numbers from [01-architecture.md](docs/ai/01-architecture.md).

---

## 2. Canonical Target Structure
```
src/
  main.ts, worker.ts, app.module.ts, worker.module.ts
  core/           # config, database, tenancy, http, errors, logger, redis, queue, health, events, notifications
  shared/         # pure TS functions & types only (cursor, duration, hashing, mask, cookie options); no Nest, no IO
  integrations/   # <capability>/ port (abstract class) + adapters/<vendor> + errors
  modules/        # <module>/ module file, index.ts (PUBLIC API), contracts/, controllers/, dto/, services/, repositories/, entities/, stores/, constants/, types/, tests/
test/e2e/         # HTTP end-to-end flow & IDOR tests
tools/            # check-rules.ts, scripts, codegen
docs/             # architecture, ai/, adr/
```

---

## 3. Layering Rules
- Flow: `Controller` (HTTP, DTO, Swagger) -> `Service` (Business rules, transactions, orchestration) -> `Repository` (ALL database queries) -> `TypeORM`.
- `Store` (optional): Redis cache over a repository (`entity:{orgId}:{id}`). TTL required; invalidate after commit.
- **Prohibitions**: Services MUST NOT import TypeORM or `@nestjs/typeorm`. Controllers MUST NOT call repositories. Repositories MUST NOT expose generic pass-through `find(options)` methods. Business rules live ONLY in services or pure domain functions.

---

## 4. Multi-Tenancy Defense (4 Layers)
1. **JWT Identity**: `organization_id` comes ONLY from verified JWT via `TenantContext`. Never read `orgId` from route parameters, body, or query.
2. **Tenant Repository**: Tenant entities extend `TenantBaseEntity` and use `TenantScopedRepository` (adds `organization_id = :orgId`).
3. **Database FKs**: All foreign keys MUST follow organization hierarchy.
4. **Composite Indexes**: Composite indexes on tenant tables MUST start with `organization_id`.
- **Cross-Tenant Behavior**: Lookups for another tenant return `404 NOT_FOUND` (never 403) to prevent enumeration.
- **Unscoped Exemption**: The ONLY query allowed without `organization_id` is `UserRepository.findByEmailForAuth`.

---

## 5. Module Public API & Contracts
- Import strictly from `modules/<name>` (`index.ts`).
- `index.ts` exports ONLY: module class, contract abstract classes, public types/enums, and public DTO types. NEVER entities, repositories, or internal services.
- Cross-module calls use contract abstract classes (e.g. `UserDirectory`). Bind with `{ provide: ContractClass, useExisting: InternalService }`.

---

## 6. Integrations (Ports & Adapters)
- External vendors follow Ports & Adapters: Port (abstract class DI token) + Adapters (`adapters/<vendor>`) + Factory by env.
- Vendor SDK imports (`nodemailer`, `razorpay`, `@aws-sdk/s3`) allowed ONLY inside adapter files in `integrations/<capability>/adapters/`.
- Errors mapped to domain error classes with `retryable: boolean`. Webhook parsing and signature verification live inside the adapter.

---

## 7. Code Style & Naming
- **TypeScript**: Strict mode. `any` is FORBIDDEN; use `unknown` or Zod. Explicit return types required on public methods and exported functions. No default exports. No barrel re-export-all (`export *`). No floating promises. No `await` in loops unless sequential (comment required). Early returns preferred.
- **Limits**: Max ~300 lines/file, ~50 lines/function. Cyclomatic complexity <= 10. Single class per file.
- **Suffixes**: Kebab-case (`.module.ts`, `.controller.ts`, `.service.ts`, `.repository.ts`, `.store.ts`, `.entity.ts`, `.dto.ts`, `.guard.ts`, `.processor.ts`, `.provider.ts`, `.spec.ts`, `.int-spec.ts`, `.e2e-spec.ts`).
- **Naming**: Classes PascalCase with suffix. Interfaces PascalCase (no `I` prefix). Enums PascalCase with PascalCase members. Constants `SCREAMING_SNAKE`. DB columns `snake_case`. Routes lowercase plural kebab (`/api/v1/property-units`). Permissions `resource:action`. Error codes `SCREAMING_SNAKE` in `ErrorCode`. Queue names `domain.action`. Single quotes, 2 spaces, print width 100.

---

## 8. Reusable Code Policy
- Search `shared/`, `core/`, and [11-reusable-catalog.md](docs/ai/11-reusable-catalog.md) before writing helpers.
- **Rule of Three**: Extract 3rd duplicate to `shared/` (pure TS) or `core/` (NestJS).
- Update [11-reusable-catalog.md](docs/ai/11-reusable-catalog.md) in the same change when adding/modifying reusable items.

---

## 9. API Conventions
- Prefix: `/api/v1`.
- Envelope: `{ success: true, data: T, meta: { requestId, timestamp, page? } }`. Error: `{ success: false, error: { code, message, details? }, meta: { requestId } }`.
- Pagination: Keyset cursor (`created_at, id`) for large lists (`PaginatedResult`); offset for small static lists.
- Filters/Sorting via validated query DTOs (`?status=ACTIVE&sort=created_at:desc`). Idempotency keys for payment/money operations. Money as `NUMERIC(12,2)`. PKs as UUID v4. Timestamptz.

---

## 10. Testing Standards
- **Unit (`*.spec.ts`)**: Fast, pure logic tests using fake in-memory repositories. NEVER mock TypeORM internals.
- **Integration (`*.int-spec.ts`)**: Real Postgres tests. Must include table-driven cross-tenant isolation test.
- **E2E (`test/e2e/*.e2e-spec.ts`)**: HTTP flow tests. Must include an IDOR test per resource.
- **Contract Tests**: Standardized suites verifying all adapters against port interface.
- AAA pattern, single behavior per test, descriptive names. No skipped (`it.skip`) or focused (`fit`) tests. Test requirements per endpoint: DTO validation, permission check, tenant isolation. Coverage MUST NOT decrease.

---

## 11. Security & Logging
- NEVER log secrets, JWTs, passwords, OTPs, or unmasked PII (mask email/phone).
- Structured Pino logging with `requestId`. Levels: `error` (system broken), `warn` (unexpected handled), `info` (milestone), `debug` (diagnostic).
- No raw SQL string concatenation. Validate all input with DTOs. Enforce least-privilege `@RequirePermissions`.

---

## 12. Git & Workflow Discipline
- **CRITICAL**: NEVER run `git commit`, `git add`, `git push`, or `git commit --amend` unless the user explicitly asks in the current message. Finishing a task is NOT permission to commit.
- Conventional commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`) when instructed.
- Plan before code for changes touching >3 files. Ask before making decisions not covered by docs.
- Run `yarn lint`, `yarn test`, `yarn build`, and `yarn rules:check` after changes. Run `yarn test:e2e` when touching auth, tenancy, or repositories.

---

## 13. Commands Reference
- `yarn start:dev`: NestJS API watch mode. `yarn worker`: BullMQ worker process.
- `yarn build`: Compile to `dist/`. `yarn lint`: ESLint check. `yarn rules:check`: Validate rules & docs.
- `yarn test`: Jest unit/integration tests. `yarn test:e2e`: HTTP E2E tests against DB/Redis.
- `yarn migration:run` / `yarn migration:generate` / `yarn migration:revert`: TypeORM migration commands.
- `yarn seed`: Seed roles, permissions, super admin, demo data.
- `docker compose up postgres redis -d`: Run local DB & Redis containers.

---

## 14. Definition of Done (DoD)
1. `yarn lint`, `yarn test`, `yarn build`, `yarn rules:check` pass cleanly.
2. Unit, integration, and E2E tests written & passing; coverage non-decreasing.
3. Tenant isolation and permission checks verified for all endpoints.
4. Reusable utilities cataloged in [11-reusable-catalog.md](docs/ai/11-reusable-catalog.md).
5. OpenAPI spec updated if API changed.
6. DB migrations reviewed and tested bi-directionally.
7. No `TODO` comments without issue numbers.

---

## Detailed Rules Index
- Flow: [01-architecture.md](docs/ai/01-architecture.md)
- Style: [02-code-style-and-naming.md](docs/ai/02-code-style-and-naming.md)
- Tenancy: [03-data-access-and-tenancy.md](docs/ai/03-data-access-and-tenancy.md)
- Integrations: [04-integrations.md](docs/ai/04-integrations.md)
- API: [05-api-conventions.md](docs/ai/05-api-conventions.md)
- Testing: [06-testing.md](docs/ai/06-testing.md)
- Security: [07-security-and-logging.md](docs/ai/07-security-and-logging.md)
- Git & Workflow: [08-git-and-workflow.md](docs/ai/08-git-and-workflow.md)
- Review Checklist: [09-review-checklist.md](docs/ai/09-review-checklist.md)
- Roadmap: [10-roadmap-and-status.md](docs/ai/10-roadmap-and-status.md)
- Catalog: [11-reusable-catalog.md](docs/ai/11-reusable-catalog.md)
- ADRs: [docs/adr/](docs/adr/)
