# ADR 0003: Dedicated Repository Layer & Explicit Transaction Management

* **Status**: Accepted
* **Date**: 2026-09-17
* **Deciders**: Backend Lead, Database Architect

## Context and Problem Statement
In NestJS applications using TypeORM, developers often inject `@InjectRepository(Entity)` directly into business services. This couples business rules directly to ORM querying methods, allows unrestricted SQL query builder usage in services, and makes transaction management error-prone.

## Decision Drivers
* Strict separation between business orchestration (Services) and database queries (Repositories).
* Deterministic multi-entity database transactions.
* Enforced multi-tenant query filtering on every database operation.

## Considered Options
1. Inject TypeORM `Repository<Entity>` directly into NestJS Services.
2. Custom Repository subclasses extending TypeORM `Repository` with custom query methods.
3. Decoupled Repository Pattern using `TenantScopedRepository` / `GlobalRepository` base classes combined with `TransactionRunner`.

## Decision Outcome
Chosen option: "Decoupled Repository Pattern using `TenantScopedRepository` / `GlobalRepository` base classes combined with `TransactionRunner`", because it isolates TypeORM dependencies completely within repository classes and mandates intent-named query methods.

### Architecture Rules
- Services MUST NOT import TypeORM or `@nestjs/typeorm`.
- All database access goes through custom repository classes placed in `modules/<module>/repositories/` or `core/database/base/`.
- Multi-tenant repositories extend `TenantScopedRepository<T>`, which retrieves `organization_id` from `TenantContext` and automatically appends `organization_id = :orgId` on all queries.
- Multi-entity transactions execute via `TransactionRunner.runInTransaction(async (entityManager) => { ... })`.
- Repositories expose explicit intent-named query methods (e.g., `findByIdInOrg`, `listPage`), never generic pass-through methods.

### Positive Consequences
- Business services can be unit tested with fast in-memory fake repositories without mocking TypeORM internals.
- Impossible to accidentally omit `organization_id` filter on tenant queries.

### Negative Consequences
- Requires writing explicit repository methods for custom queries instead of inline ORM calls.
