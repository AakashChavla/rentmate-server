---
name: new-migration
description: Create a TypeORM migration for database schema changes
---

# New Migration Workflow
To create a new database migration:

1. Run code generator or TypeORM CLI:
   ```bash
   yarn migration:generate <name>
   ```
2. Verify composite indexes start with `organization_id` on tenant tables.
3. Verify foreign key actions and bi-directional up/down migration logic.
4. Refer to `docs/ai/03-data-access-and-tenancy.md`.
