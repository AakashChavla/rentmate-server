# Workflow: Create New Database Migration

1. Run TypeORM migration generator:
   ```bash
   yarn migration:generate src/core/database/migrations/<name>
   ```
2. Verify composite indexes start with `organization_id`.
3. Follow rules in `docs/ai/03-data-access-and-tenancy.md`.
4. Run validation: `yarn build`, `yarn migration:run`.
