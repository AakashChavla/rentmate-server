# Rule: Data Access and Multi-Tenancy

Strictly enforce database layering and multi-tenant data isolation across all queries.

## Core Directives
- **Layer Flow**: Controller -> Service -> Repository -> TypeORM. Services NEVER import TypeORM or `@nestjs/typeorm`. Controllers NEVER call repositories directly.
- **Tenant Context**: `organization_id` comes ONLY from verified JWT via `TenantContext`. NEVER read `orgId` from route parameters or request body.
- **Tenant Repositories**: Tenant entities extend `TenantBaseEntity` and use `TenantScopedRepository` (automatically appends `organization_id = :orgId`).
- **Cross-Tenant Security**: Lookups targeting another tenant MUST return `404 NOT_FOUND` (never 403) to prevent resource enumeration.
- **Intent-Named Methods**: Repositories MUST NOT expose generic pass-through `find(options)` methods. Use explicit domain intent methods (e.g. `findByIdInOrg`).

Detailed guide: [03-data-access-and-tenancy.md](docs/ai/03-data-access-and-tenancy.md)
