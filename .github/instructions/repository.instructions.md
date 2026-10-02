---
applyTo: "**/*.repository.ts"
---

# Repository Scope Instructions

- Repositories perform ALL database access. Services MUST NOT import TypeORM.
- Tenant repositories extend `TenantScopedRepository` to enforce `organization_id = :orgId`.
- Use explicit intent-named query methods (e.g. `findByIdInOrg`). Avoid generic pass-through methods.
- Store (Redis cache) wraps repository calls; cache keys MUST follow `entity:{orgId}:{id}`.
- Cross-tenant queries return 404 NOT_FOUND, never 403 FORBIDDEN.
- Full details: [03-data-access-and-tenancy.md](docs/ai/03-data-access-and-tenancy.md)
