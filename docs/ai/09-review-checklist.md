# 09. Self-Review & Pull Request Checklist

This document acts as a standalone, tool-agnostic self-review checklist prompt to evaluate code changes before opening a Pull Request.

---

## Standalone Self-Review Prompt

Run this self-review checklist against all code changes before submitting a PR:

### 1. Architecture & Layering
- [ ] Does the module follow the vertical slice and layer hierarchy (L0 to L7)?
- [ ] Is `core/`, `shared/`, or `integrations/` free of any imports from `modules/`?
- [ ] Are cross-module dependencies accessed strictly via `modules/<module>/index.ts` and abstract contract tokens?
- [ ] Are upward layer communications handled strictly via domain events (`@nestjs/event-emitter`)?

### 2. Multi-Tenancy & Data Isolation
- [ ] Is `organization_id` derived exclusively from verified JWT via `TenantContext`?
- [ ] Does every tenant entity extend `TenantBaseEntity` and use `TenantScopedRepository`?
- [ ] Do composite indexes on tenant tables start with `organization_id`?
- [ ] Do cross-tenant resource lookups return `404 NOT_FOUND` (never 403)?

### 3. Layer Responsibilities & Patterns
- [ ] Does the Controller handle HTTP routing, Swagger annotations, and DTO validation ONLY?
- [ ] Are Services free of any TypeORM or `@nestjs/typeorm` imports?
- [ ] Are all database operations performed by custom repositories with intent-named methods?
- [ ] If Redis caching (`Store`) is used, are keys formatted as `entity:{orgId}:{id}` with declared TTL and invalidation after write?

### 4. Third-Party Integrations
- [ ] Are vendor SDK library imports (`nodemailer`, `razorpay`, `@aws-sdk/s3`) restricted strictly to `integrations/<capability>/adapters/`?
- [ ] Are external services accessed via abstract Port DI tokens?
- [ ] Are vendor errors mapped to domain error classes with a `retryable: boolean` property?
- [ ] Is webhook signature verification and raw parsing contained inside the integration adapter?

### 5. Code Style & TypeScript
- [ ] Is the code completely free of `any` types?
- [ ] Do all public methods and exported functions have explicit return types?
- [ ] Are there no default exports, no barrel re-export-all (`export *`), and no floating promises?
- [ ] Are file line count (~300 max), function line count (~50 max), and cyclomatic complexity (<=10) respected?
- [ ] Do all files use kebab-case with correct role suffixes (`.controller.ts`, `.service.ts`, `.repository.ts`, etc.)?

### 6. Testing & Quality
- [ ] Do unit tests (`*.spec.ts`) use fake in-memory repositories instead of mocking TypeORM internals?
- [ ] Do integration tests (`*.int-spec.ts`) run against real Postgres and include a cross-tenant isolation test?
- [ ] Do E2E tests (`test/e2e/`) include an IDOR security test for new endpoints?
- [ ] Are all tests structured with AAA (Arrange-Act-Assert) and free of `it.skip` or `fit`?

### 7. Security & Logging
- [ ] Are logs free of unmasked PII, passwords, OTPs, JWTs, or secrets?
- [ ] Are email and phone fields masked using `mask.email()` / `mask.phone()`?
- [ ] Are structured Pino log objects used with `requestId`?
- [ ] Is raw SQL string concatenation completely avoided?

### 8. Verification Commands
- [ ] Have `yarn rules:check`, `yarn lint`, `yarn test`, and `yarn build` passed cleanly?

---

## Do & Don't Block

```ts
// DO: Check all items in this review list before submitting a PR
// Run: yarn rules:check && yarn lint && yarn test && yarn build

// DON'T: Skip tenant isolation tests or leave console.log / TODO comments without issue numbers
```
