# RentMate — cleanup prompts before Phase 3

Run in this order. One commit per prompt (prompt 3 and 4: one commit per module). Paste each into your IDE agent as-is.

---

## Prompt 0 — Install the rule pack
```
Copy these files into the rentmate-server repo root exactly as provided: AGENTS.md, CLAUDE.md, GEMINI.md, .github/copilot-instructions.md, .cursor/rules/rentmate.mdc, docs/architecture.md. Do not edit their content. Add a "AI rules" section to README.md linking to AGENTS.md and docs/architecture.md. Do not commit.
```

---

## Prompt 1 — Restructure (no behavior change)
```
You are a senior NestJS engineer in the existing "rentmate-server" repo (Phases 1-2 done). Read AGENTS.md and docs/architecture.md first and follow them strictly. Goal: make the file and folder structure match AGENTS.md section 4 and 5 with ZERO behavior change (no HTTP/OpenAPI/migration/error-code changes).

## Do this, in order, running `yarn lint && yarn test && yarn test:e2e && yarn build` after each step
1. Print the current `src/` and `test/` tree and a table of every file that will move/rename/delete. Wait for no approval; just proceed after printing.
2. Delete re-export shims: `src/queues/email-job.ts` (import from its real home instead). One home per type.
3. Entities: move each `*.entity.ts` into `src/modules/<feature>/entities/` (auth: otp-verification, refresh-token; authorization: role, permission, role-permission, user-role-assignment; users: user; organizations: organization). Update imports, TypeOrmModule.forFeature and data-source glob. No migration should be generated: verify with `yarn migration:generate` producing no diff, then delete any empty file it creates.
4. DTOs: ensure every module has `dto/` with `<action>-<feature>.dto.ts` / `<feature>-response.dto.ts`. Split `auth.dto.ts` and `user.dto.ts` into one file per DTO group (login, otp, password, user list query, assign role, etc.).
5. Processors belong to their feature: move `src/queues/email.processor.ts` and `email-worker.module.ts` into `src/modules/notifications/processors/`. Keep only `queue.constants.ts`, `base.processor.ts`, `queues.module.ts` in `src/queues/`. Rename `notification.service.ts` -> `notifications.service.ts`.
6. Move `maskEmail` out of the processor into `src/common/utils/mask.ts` (with a unit test). Replace every ad-hoc masking with it.
7. Fix the hardcoded job name: `NotificationService.sendEmail` must use `job.template` as the BullMQ job name instead of the literal 'otp'.
8. Tests: reorganize to `test/unit/<mirrors src path>/`, `test/integration/`, `test/e2e/`, `test/support/` (fake-email.provider.ts, factories, setup-env), `test/contracts/`. Update jest configs (unit: `test/unit/**/*.spec.ts`; e2e unchanged) and add `yarn test:unit`. Keep all assertions.
9. Root cleanup: no stray files in `src/` root beyond main.ts, worker.ts, app.module.ts, worker.module.ts. Move `src/types/express.d.ts` under `src/common/types/`. Remove unused exports/files (use `ts-prune` or `knip` via npx, do not add as a dependency).
10. Update README folder-structure section and docs/integrations.md paths.

## Rules
- Use `git mv` (do not commit) so history is preserved.
- Diff /api/docs-json before and after: must be identical.
- Do not add dependencies. Do not touch business logic beyond items 6-7.

## Definition of done
lint, unit, e2e, build green; docker compose still builds; OpenAPI diff empty; `src/` tree matches AGENTS.md section 4; tests mirror src.

Work step by step. At the end print the final tree and a before/after move table. Ask before making any decision not covered above.
```

---

## Prompt 2 — Repository layer (all DB logic in one place)
```
You are a senior NestJS engineer in the existing "rentmate-server" repo (restructure done). Read AGENTS.md section 3 and docs/architecture.md. Goal: ALL database access lives in repository classes; services contain only business logic. Behavior-preserving: no HTTP/API/OpenAPI/schema/migration changes.

## Target
Controller -> Service -> Repository -> TypeORM. Only `*.repository.ts`, `*.entity.ts`, `src/database/**`, `src/common/base/**`, `*.module.ts` (forFeature) and tests may import 'typeorm' or '@nestjs/typeorm'.

## Base classes (src/common/base/)
- Keep `TenantRepository<T>` as the low-level guard (do not weaken).
- Add `TenantScopedRepository<T extends TenantBaseEntity>`: abstract base composing TenantRepository; every public method takes `organizationId`; protected helpers `scoped(orgId)`, `qb(orgId, alias)`, `save`, `softDeleteById`. Subclasses must not be able to bypass org scope.
- Add `GlobalRepository<T extends BaseEntity>` for intentionally global tables (roles, permissions, role_permissions, organizations).
- Add `TransactionRunner` (`run<T>(fn): Promise<T>`) using AsyncLocalStorage to hold the active EntityManager; repositories resolve their repo from the ambient manager if present. Supports nesting (join outer), rolls back on throw, exported from DatabaseModule (global). No forwardRef.

## Repositories (one per aggregate, next to its entity, exported by its module)
- UserRepository: findByIdInOrg, findByEmailForAuth (the ONLY unscoped query; replaces AuthUserLookup, delete it, keep the explanatory comment), listPage (move query-builder/keyset SQL here incl. ILIKE escaping), updateProfile/updateStatus, recordLoginSuccess, recordLoginFailure/lock.
- UserRoleAssignmentRepository: findActiveByUser, findByIdInOrg, create, delete, countOrgOwners.
- RefreshTokenRepository: create, findByJti, markRotated, revokeFamily, revokeAllForUser, revokeAllExcept.
- OtpVerificationRepository: invalidateActive, create, findLatestActive, incrementAttempts, markConsumed.
- RoleRepository, PermissionRepository, RolePermissionRepository (GlobalRepository), OrganizationRepository (findById, findBySlug).
- Methods are intent-named with plain domain types; never expose generic `find(options)`.
- Cross-module use: inject another module's repository only if exported and the direction is downward in the layer order. On a cycle: stop and propose a fix (move method behind the owning service or emit a domain event). Never forwardRef.

## Services
- Remove every `@InjectRepository`, `Repository<>`, `QueryBuilder`, `IsNull` and raw SQL from services, guards, controllers (AuthService, TokenService, OtpService, PermissionService, UsersService, RolesController, JwtAuthGuard).
- Use `TransactionRunner` in the SERVICE for: refresh rotation (revoke old + insert new), password reset (update password + consume OTP + revoke sessions), role assign/remove incl. LAST_OWNER check, user suspension (status + session revocation). Redis invalidation and email enqueue happen AFTER commit.
- Business rules (LAST_OWNER, cannot suspend self, cannot assign SUPER_ADMIN, lockout thresholds) stay in services.

## Enforcement
- ESLint `no-restricted-imports` for 'typeorm' and '@nestjs/typeorm' in `*.service.ts`, `*.controller.ts`, `*.guard.ts`, `*.processor.ts`, `*.pipe.ts`, `*.interceptor.ts`, `*.filter.ts`; allowed in repositories, entities, `src/database/**`, `src/common/base/**`, `*.module.ts`, tests. `yarn lint` must pass.

## Tests
- Unit tests for services use typed in-memory fake repositories from `test/support/fakes/`.
- New `test/integration/` (real Postgres, same jest setup): table-driven test covering EVERY public method of every TenantScopedRepository subclass: data in Org A and Org B, Org A calls never see or modify Org B rows. A new method must be impossible to forget (test fails if a public method is not listed).
- TransactionRunner tests: commit, rollback on error, nested join, parallel transactions do not leak across AsyncLocalStorage contexts, repository calls work inside and outside.
- Existing e2e (auth, RBAC, IDOR 404, refresh reuse) must pass unchanged.

## Rules
- Module by module (organizations -> users -> authorization -> auth), app compiling and tests green after each; one commit-sized change per module (do not commit).
- No pass-through repositories: every method must be used by a service or test.
- Seeds may use DataSource directly.

## Definition of done
`grep -rE "@nestjs/typeorm|from 'typeorm'" src` matches only allowed locations; lint/test/test:e2e/build green; OpenAPI diff empty; a forced mid-way failure in each multi-step operation leaves nothing persisted (prove with a test).

Work step by step. At the end print: repositories and their methods, transactions introduced, any dependency cycle found and how you handled it. Ask before making any decision not covered above.
```

---

## Prompt 3 — Internal abstractions (replaceable infra behind ports)
```
You are a senior NestJS engineer in the existing "rentmate-server" repo (repository layer done). Read AGENTS.md. Goal: make internal infrastructure replaceable behind small ports, same pattern as src/integrations/email, and decouple modules with domain events. Behavior-preserving: no HTTP/OpenAPI/schema changes.

## 1. CachePort (src/infrastructure/cache/)
- `abstract class CachePort { get<T>(key); set(key, value, ttlSeconds?); del(...keys); delByPrefix(prefix) }` (Nest DI token).
- `RedisCacheAdapter` (ioredis) in `adapters/`; `InMemoryCacheAdapter` for unit tests in test/support.
- Key builder helper `cacheKey(namespace, ...parts)`; all keys namespaced `rentmate:<ns>:...`.
- Replace direct Redis use in PermissionService (auth:ctx:{userId}) and any other business code with CachePort. Throttler/BullMQ/health keep using Redis directly (infrastructure).

## 2. DomainEventBus (src/infrastructure/events/)
- `abstract class DomainEventBus { publish(event: DomainEvent): Promise<void> }`, `DomainEvent { name, occurredAt, organizationId?, payload }`.
- `InProcessEventBusAdapter` using @nestjs/event-emitter (only new dependency allowed). Handlers are `@OnEvent` listeners that run AFTER the transaction commits; failures in handlers are logged and never break the caller.
- Event names as constants per module (`events/<feature>.events.ts`). Add first events: `user.suspended`, `user.role-assigned`, `user.role-removed`, `auth.password-reset`.
- Move side effects out of services into listeners: session revocation + permission-cache invalidation on `user.suspended`/role changes live in a listener in authorization/auth, not inside UsersService. Upstream (lower-layer) modules emit; they never import higher layers.
- Document how to swap to a BullMQ/outbox-backed bus later (one adapter + one provider line).

## 3. Module public APIs
- Each module exports ONLY its service(s) (and repository where AGENTS.md allows). Add `index.ts` barrel per module exporting the public surface; other modules import from the barrel only, never deep paths. Add an ESLint `no-restricted-imports` pattern forbidding `modules/*/*/**` deep imports from outside the module.

## 4. Other ports (create the interface + one adapter now, nothing else)
- `ClockPort` (now()) so time-dependent logic (OTP expiry, token TTL, lockout) is testable; replace `new Date()` / `Date.now()` in services.
- Leave PaymentGateway/Sms/Whatsapp/Push/FileStorage as documented "planned ports" in docs/integrations.md only.

## Tests
- CachePort contract suite run against both adapters; DomainEventBus: handler runs after commit, handler failure does not break publisher, listeners not called on rollback; services tested with InMemoryCache + fake bus + fake clock.
- Existing unit + e2e suites unchanged and green.

## Rules
- Lower layers never import higher layers; no forwardRef.
- Update AGENTS.md section 7 (reusable blocks) and docs/architecture.md with the new ports; update README.

## Definition of done
lint, unit, integration, e2e, build green; OpenAPI diff empty; `grep -r "ioredis\|new Date()" src/modules` shows no business-code usage; suspending a user still revokes sessions and clears the permission cache (via event); adding a cache backend = one adapter + one provider line.

Work step by step. At the end print new/changed files, env vars (should be none), and events added. Ask before making any decision not covered above.
```

---

## Prompt 4 — Verify (optional, run after 1-3)
```
Audit rentmate-server against AGENTS.md. Do not change code. Output a checklist table (rule, pass/fail, file:line evidence) covering: layering violations, TypeORM imports outside allowed files, tenant-scope bypasses, missing tests per repository method, naming/folder violations, files over 300 lines, functions over 40 lines, console usage, any, secrets in logs, unused exports. Then list the fixes in priority order.
```
