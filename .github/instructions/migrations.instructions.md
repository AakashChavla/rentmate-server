---
applyTo: "src/database/migrations/**"
---

# Migrations Scope Instructions

- `synchronize: false` is strictly enforced. All schema changes MUST use TypeORM migrations.
- Primary keys must be UUID v4 via `gen_random_uuid()`. Timestamps must use `timestamptz`.
- Multi-tenant tables must include `organization_id NOT NULL` and a foreign key to `organizations`.
- Every composite index on tenant tables MUST start with `organization_id`.
- Ensure `up()` and `down()` methods are fully reversible and tested bi-directionally.
- Full details: [03-data-access-and-tenancy.md](docs/ai/03-data-access-and-tenancy.md)
