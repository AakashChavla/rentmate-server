# AGENTS.md — RentMate Server

Canonical rules for every AI tool (Claude Code, Cursor, Copilot, Antigravity/Gemini). `CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md` and `.cursor/rules/*` point here. Edit this file only.

## 0. Hard rules (never break)
1. **Git:** never run `git add/commit/push/amend` unless the current user message asks. Finishing a task is not permission.
2. **Flow:** follow the PropFlow architecture doc (`docs/architecture.md`). Do not invent modules, endpoints or entities outside the current phase. Unclear → ask, don't guess.
3. **Tenancy:** `organization_id` comes only from the verified JWT via `TenantContext`. Never from body/query/params.
4. **No behavior drift in refactors:** diff `/api/docs-json` before/after; it must be empty unless the task says otherwise.
5. **Secrets:** never hardcode, never log (passwords, OTPs outside the dev flag, tokens, SMTP creds).
6. **Schema changes** only via TypeORM migrations (`yarn migration:generate`, then review the SQL). `synchronize` is always false.
7. **One task = one commit-sized change.** Keep lint, unit, e2e and build green before declaring done.

## 1. Stack
Node 20 LTS, TypeScript strict, NestJS 11 (modular monolith), PostgreSQL 16 + TypeORM, Redis 7 + BullMQ, Pino, class-validator, Zod (env), Swagger, Jest, ESLint + Prettier + Husky, yarn.

## 2. Commands
`yarn start:dev` · `yarn worker` · `yarn lint` · `yarn test` · `yarn test:e2e` · `yarn build` · `yarn migration:generate|run|revert` · `yarn seed`
Single test: `yarn jest <path> -t "<name>"`.
Infra: `docker compose up -d postgres redis`.

## 3. Layering (dependency direction: down only)
```
Controller  (HTTP, DTOs, Swagger, guards)
   ↓
Service     (business rules, orchestration, transactions)
   ↓
Repository  (ALL database access; the only place TypeORM is used)
   ↓
Entity / DB
```
- Controllers never touch repositories or TypeORM.
- Services never import `typeorm` / `@nestjs/typeorm`.
- Only `*.repository.ts`, `*.entity.ts`, `src/database/**`, `src/common/base/**`, `*.module.ts` (forFeature) and tests may import TypeORM. ESLint enforces this.
- Third-party systems (email, SMS, payment, storage) sit behind a **port** in `src/integrations/<name>/`; business code depends on the port only.
- Cross-module calls go through the other module's **exported service** (never its repository, never deep imports). If it would create a cycle, stop and propose an event or a method move. No `forwardRef`.
- Module layers: L0 `auth, authorization, organizations, users` → L1 `properties, units, tenants` → L2 `leases` → L3 `invoices, payments` → L4 `complaints, visitors, notifications, reports, audit`. Lower never imports higher.

## 4. Folder structure
```
src/
  main.ts  worker.ts  app.module.ts  worker.module.ts
  config/            typed env (Zod) + AppConfigService
  common/
    base/            BaseEntity, TenantBaseEntity, TenantScopedRepository, GlobalRepository, TransactionRunner, TenantContext
    constants/       error-codes.ts, shared enums
    decorators/ filters/ interceptors/ middleware/ pipes/ interfaces/ swagger/
    utils/           pure, stateless helpers only (cursor, duration, cookie options)
  database/          data-source, migrations/, seeds/
  integrations/<name>/   <name>.provider.ts (port), adapters/, <name>.module.ts, errors, templates/
  queues/            queue.constants, base.processor, queues.module  (processors live with their feature, see below)
  redis/ logger/ health/
  modules/<feature>/
    <feature>.module.ts
    <feature>.controller.ts
    <feature>.service.ts
    <feature>.repository.ts
    entities/<feature>.entity.ts
    dto/               <action>-<feature>.dto.ts, <feature>-response.dto.ts
    processors/        BullMQ processors owned by this feature
    events/            domain events (when used)
    constants/ types/  feature-local only
test/
  unit/<mirrors src path>/*.spec.ts
  e2e/*.e2e-spec.ts
  integration/       repository tests on real Postgres
  support/           fakes, factories, builders, setup-env
  contracts/         shared adapter contract suites
docs/                architecture.md, integrations.md
```
Rules: no loose files in `src/` root beyond the entrypoints. No re-export shims (no `queues/email-job.ts` re-exporting another file). One home per type.

## 5. Naming
- Files: `kebab-case.<role>.ts` — `.module .controller .service .repository .entity .dto .guard .processor .provider .interceptor .filter .pipe .decorator .spec .e2e-spec`.
- Classes `PascalCase` with role suffix (`LeasesService`, `LeaseRepository`, `CreateLeaseDto`). Interfaces/types `PascalCase`, no `I` prefix. Enums `PascalCase` name, `UPPER_SNAKE` values. Constants `UPPER_SNAKE`.
- DB: tables plural `snake_case`, columns `snake_case` (naming strategy handles it), PK `id uuid`, money `NUMERIC(12,2)`, timestamps `timestamptz`.
- Repository methods are intent-named: `findByIdInOrg`, `listPage`, `countOrgOwners`, `revokeFamily`. Never expose `find(options)` pass-throughs.
- Routes: plural nouns, kebab-case, under `/api/v1`. Error codes `UPPER_SNAKE` in `error-codes.ts`.

## 6. Code quality
- Explicit return types on exported functions and public methods. No `any` (use `unknown` + narrowing). No non-null `!` without a comment.
- Single quotes, `printWidth 100`, trailing commas (Prettier). Imports: node builtins → third-party → internal; `import type` for types.
- Functions ≤ 40 lines, files ≤ 300 lines, one responsibility each. Extract when exceeded.
- Reuse before writing: search `common/` and the owning module first. Duplicated logic in 2 places → move to `common/utils` (pure) or a service (stateful). Don't create a util for one caller.
- Errors: throw `AppException(ErrorCode, message, status, details?)`. Never throw bare `Error`/`HttpException` from services. Add new codes to `error-codes.ts`.
- DTOs: class-validator + `@ApiProperty`. Never return entities directly; map to response DTOs (never leak `password_hash`, token hashes).
- Lists: cursor pagination via `common/utils/cursor.ts` + `PaginatedResult`. Response envelope is automatic; never hand-build it.
- Transactions: `TransactionRunner.run()` in the **service** when ≥2 writes must be atomic. Cache/Redis invalidation and enqueueing happen **after** commit.
- Logging: Pino with context object first, message second. Mask PII (emails `a***@d.com`). No `console.*`.
- Config: only through `AppConfigService`; new env var = update `env.schema.ts`, `.env.example`, README, docker-compose in the same change.
- Comments explain *why*, not *what*. Remove dead code and unused exports.

## 7. Reusable building blocks (use these, don't reimplement)
`TenantScopedRepository` / `GlobalRepository` · `TransactionRunner` · `TenantContext` · `AppException` + `ErrorCode` · `PaginatedResult` + cursor helpers · `@Public()` `@RequirePermissions()` `@CurrentUser()` · `NotificationService.sendEmail()` · `EmailProvider` port · `BaseProcessor` · `buildCookieOptions()`.

## 8. Adding a feature (checklist, in order)
1. Confirm it is in the current phase of `docs/architecture.md`.
2. Entity (`TenantBaseEntity` for tenant data) → migration (generate, review SQL, add indexes starting with `organization_id`).
3. Repository (extends `TenantScopedRepository`) with intent-named methods.
4. Service (rules, transactions, errors).
5. DTOs → controller (Swagger decorators, `@RequirePermissions`).
6. Module wiring: export the service, never the repository (unless a downstream module is allowed per §3).
7. Permissions: add to `permission-catalog.ts` + seed mapping.
8. Tests (§9). Update README/docs. Run lint, test, e2e, build.

## 9. Testing
- Pyramid: many unit tests, fewer repository/integration tests on real Postgres, few e2e flows.
- Unit: services/guards/pipes with typed fake repositories from `test/support`. Deterministic, no network, no real Redis/DB. Mirror `src` path under `test/unit/`.
- Integration (`test/integration/`): every method of every `TenantScopedRepository` subclass proves Org A cannot see or modify Org B rows (table-driven).
- E2E: login → protected route → refresh → logout; 401 no session; 403 no permission; cross-org access returns **404**; use `FakeEmailProvider`, never real SMTP.
- Every new endpoint: happy path, validation error, 401/403, cross-tenant 404. Every bug fix: a regression test first.
- Test names: `describe('<Class>')` / `it('<does X when Y>')`. Factories/builders in `test/support`, no copy-pasted fixtures.
- Contract suites for adapters (`emailProviderContract(createProvider)`); a new adapter must pass it.

## 10. Security checklist
Validate every input (whitelist + forbidNonWhitelisted). Parameterized queries only (no string-built SQL except escaped keyset helpers inside repositories). Permission check on every non-public route. Argon2id for passwords. Tokens hashed at rest. No user enumeration. Rate-limit auth routes. Audit-log sensitive actions once `audit` exists.

## 11. Workflow for the agent
1. Read this file, `docs/architecture.md`, and the files you will touch.
2. State a short plan (files to add/change). Ask if a decision is not covered.
3. Make the smallest change that satisfies the task; match existing conventions.
4. Run `yarn lint && yarn test && yarn test:e2e && yarn build`.
5. Report: files changed, new env vars/error codes/permissions, anything skipped. Do not commit unless asked.
