# 11. Reusable Code & Components Catalog

This catalog documents all existing reusable utilities, base classes, decorators, and services across `rentmate-server`.

> **Mandatory Rule**: Before writing any new utility or helper function, search `shared/`, `core/`, and this catalog. Extract to `shared/` (pure TS) or `core/` (NestJS) on the third duplicate usage. Update this catalog in the exact same change whenever a reusable item is added or modified.

---

## 1. Database & Repositories

- **`TenantScopedRepository<T>`**:
  - *Use it when*: Creating custom repositories for entities that belong to an organization and require automatic multi-tenant data isolation.
  - *Example*: `export class PropertyRepository extends TenantScopedRepository<PropertyEntity> {}`

- **`GlobalRepository<T>`**:
  - *Use it when*: Creating repositories for system-wide entities (e.g. system permissions, global roles, system audit logs) that do not belong to a specific tenant.
  - *Example*: `export class RoleRepository extends GlobalRepository<RoleEntity> {}`

- **`TransactionRunner`**:
  - *Use it when*: Executing multiple database repository operations within an atomic database transaction.
  - *Example*: `await this.transactionRunner.runInTransaction(async (em) => { await repo.saveWithManager(em, entity); });`

---

## 2. API Envelopes & Cursor Helpers

- **`PaginatedResult<T>` & Cursor Helpers**:
  - *Use it when*: Returning keyset cursor-paginated response lists from repositories and controllers.
  - *Example*: `const result = buildPaginatedResult(items, limit, (item) => ({ createdAt: item.createdAt, id: item.id }));`

- **`AppException` & `ErrorCode`**:
  - *Use it when*: Throwing domain business errors with standardized error codes and HTTP status mappings.
  - *Example*: `throw new AppException(ErrorCode.TENANT_SCOPE_MISSING, 'Tenant context not set', HttpStatus.BAD_REQUEST);`

- **`ApiEnvelope` Swagger Helpers**:
  - *Use it when*: Annotating controller methods for OpenAPI documentation with standard response envelopes.
  - *Example*: `@ApiEnvelopeResponse(PropertyDto, { isArray: true })`

---

## 3. Decorators & Authentication

- **`@Public()`**:
  - *Use it when*: Marking an API endpoint as publicly accessible, bypassing JWT authentication guards.
  - *Example*: `@Public() @Post('login') async login() {}`

- **`@RequirePermissions(...permissions)`**:
  - *Use it when*: Restricting controller endpoint access to users possessing specific RBAC permissions.
  - *Example*: `@RequirePermissions('property:create') @Post() async create() {}`

- **`@CurrentUser()`**:
  - *Use it when*: Injecting the authenticated user identity payload from the request context into a controller parameter.
  - *Example*: `async getProfile(@CurrentUser() user: AuthenticatedUser) {}`

- **`@SkipEnvelope()`**:
  - *Use it when*: Disabling the global response envelope wrapper for raw endpoints (e.g. health probes or raw file downloads).
  - *Example*: `@SkipEnvelope() @Get('raw') getRaw() {}`

---

## 4. Platform Services & Infrastructure

- **`AppConfigService`**:
  - *Use it when*: Accessing strongly typed environment configuration validated by Zod schemas.
  - *Example*: `const port = this.config.get('PORT');`

- **`NotificationService`**:
  - *Use it when*: Triggering platform transactional system notifications (OTP emails, password resets, organization invites).
  - *Example*: `await this.notificationService.sendOtpEmail(email, otpCode);`

- **`BaseProcessor`**:
  - *Use it when*: Implementing BullMQ queue processors with standardized error logging and retry handling.
  - *Example*: `export class EmailProcessor extends BaseProcessor { async processJob(job) {} }`

---

## 5. Pure Utilities (`shared/`)

- **`mask` (`mask.email`, `mask.phone`)**:
  - *Use it when*: Masking sensitive PII before writing to logs or diagnostic outputs.
  - *Example*: `logger.info({ email: maskEmail(user.email) }, 'User registered');`

- **`hashing` (`hashPassword`, `verifyPassword`, `hashOtp`)**:
  - *Use it when*: Hashing passwords with Argon2id or hashing OTP tokens before storing in Redis/database.
  - *Example*: `const hash = await hashPassword(rawPassword);`

- **`duration` (`parseDurationToMs`)**:
  - *Use it when*: Converting human-readable time strings (e.g. `'15m'`, `'7d'`) into milliseconds.
  - *Example*: `const ttlMs = parseDurationToMs('15m');`

- **`buildCookieOptions`**:
  - *Use it when*: Generating consistent, secure HTTP cookie options based on `NODE_ENV` and `COOKIE_DOMAIN`.
  - *Example*: `res.cookie('rm_access', token, buildCookieOptions({ maxAge: ttl }));`

---

## 6. Do & Don't Block

```ts
// DO: Re-use cataloged helpers and update catalog when adding new ones
import { buildCookieOptions } from 'src/shared/utils/cookie.util';

// DON'T: Write inline custom mask or cookie options code in controllers
res.cookie('rm_access', token, { httpOnly: true }); // BAD! Use buildCookieOptions helper
```
