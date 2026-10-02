# 03. Data Access & Multi-Tenancy Architecture

This document dictates database query rules, layer separation, custom repositories, caching, and multi-tenancy enforcement.

---

## 1. Strict Layering Separation

- **Controller**: Handles HTTP request parsing, DTO validation, and Swagger documentation ONLY. MUST NOT call repositories or ORM directly.
- **Service**: Orchestrates business rules, domain validations, and transaction boundaries. MUST NOT import TypeORM or `@nestjs/typeorm`.
- **Repository**: Encapsulates ALL database queries and SQL/TypeORM calls. Extends `TenantScopedRepository` or `GlobalRepository`.
- **Store** (Optional): Provides Redis caching over a repository. Cache keys follow `entity:{orgId}:{id}`. Must declare a TTL and invalidate cached entries immediately upon data mutation.

---

## 2. Multi-Tenancy Defense-in-Depth (4 Layers)

1. **JWT Verified Context**: `organization_id` is extracted strictly from the verified JWT by authentication guards and stored in `TenantContext` (`AsyncLocalStorage`). Never accept `organization_id` from client route parameters, body, or query strings.
2. **Tenant Scoped Repositories**: All tenant-scoped entities extend `TenantBaseEntity` (having an indexed `organization_id` column). Repositories extend `TenantScopedRepository<T>`, which automatically appends `organization_id = :orgId` to every query, insert, update, and delete. Missing tenant context throws an immediate exception.
3. **Database Foreign Keys**: All foreign key constraints follow the organizational hierarchy.
4. **Composite Database Indexes**: Composite indexes on tenant tables MUST start with `organization_id` (e.g. `INDEX idx_property_org_created (organization_id, created_at DESC, id DESC)`).

### Cross-Tenant Isolation Rule
If a request attempts to access an entity belonging to another organization, the query MUST return `404 NOT_FOUND` (never `403 FORBIDDEN`), preventing cross-tenant resource enumeration.

### Allow-Listed Unscoped Query Exemptions
The ONLY database queries allowed to omit `organization_id` (accessed via `unscopedForAuth`) are:
1. `UserRepository.findByEmailForAuth(email)`: Executed during initial login/authentication lookup before organization context is established.
2. `RefreshTokenRepository.findByJti(jti)`: Executed during refresh token lookup by JTI before payload context is verified.

All other tenant repository operations MUST use `TenantScopedRepository` scoped helpers (`findOneScoped`, `listScoped`, `saveScoped`, `updateScoped`, `softDeleteScoped`, `scopedQueryBuilder`).

---

## 3. Step-by-Step Recipe: Adding a Database Migration

1. Modify or create a TypeORM entity in `modules/<module>/entities/<name>.entity.ts`.
2. Generate migration:
   ```bash
   yarn migration:generate src/database/migrations/Add<Feature>Table
   ```
3. Inspect generated migration in `src/database/migrations/`:
   - Ensure primary key is UUID v4 via `gen_random_uuid()`.
   - Ensure timestamps use `timestamptz`.
   - Ensure tenant tables have `organization_id NOT NULL` and a foreign key to `organizations`.
   - Ensure composite indexes start with `organization_id`.
4. Test migration execution:
   ```bash
   yarn migration:run
   yarn migration:revert
   yarn migration:run
   ```

---

## 4. Do & Don't Block

```ts
// DO: Service calls intent-named repository methods
export class PropertyService {
  constructor(private readonly propertyRepo: PropertyRepository) {}

  async getProperty(id: string): Promise<PropertyEntity> {
    const property = await this.propertyRepo.findByIdInOrg(id);
    if (!property) throw new NotFoundException('Property not found');
    return property;
  }
}

// DON'T: Inject TypeORM Repository into Service or pass generic find options
export class PropertyService {
  constructor(
    @InjectRepository(PropertyEntity) // BAD! Services must not import TypeORM
    private readonly repo: Repository<PropertyEntity>,
  ) {}
}

// DON'T: Read orgId from request body or params
@Post()
async createProperty(@Body() dto: CreatePropertyDto) {
  // dto.organizationId -> BAD! Never trust client-provided orgId
}
```
