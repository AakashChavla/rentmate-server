## PR Summary
<!-- Short summary of changes introduced in this PR -->

## Verification Checklist
- [ ] **Layering**: Controller -> Service -> Repository -> TypeORM followed. No TypeORM imports in services or direct repo calls in controllers. Platform layer does not import modules.
- [ ] **Tenancy & Security**: `organization_id` derived exclusively from JWT via `TenantContext`. All queries scoped. Foreign keys & indexes start with `organization_id`. Cross-tenant lookups return 404. No secrets or PII logged.
- [ ] **Module Public API**: Cross-module imports strictly use `modules/<module>/index.ts` and abstract contract tokens.
- [ ] **Integrations**: Vendor SDK imports isolated in `src/integrations/<capability>/adapters/`. Webhooks parsed and verified inside adapter. Domain errors normalized with `retryable`.
- [ ] **Naming & Style**: Files kebab-case with role suffix. Types strict, no `any`, explicit return types on public methods. No floating promises or default exports. Max 300 lines/file, 50 lines/function.
- [ ] **Testing**: Unit tests (fake repos), integration tests (real Postgres + cross-tenant isolation), E2E tests (flow + IDOR check) passing. Test coverage has not decreased.
- [ ] **Reusable Utilities**: Checked catalog in `docs/ai/11-reusable-catalog.md`. Extracted 3rd duplicate utility and updated catalog documentation if applicable.
- [ ] **Migrations**: TypeORM migration created, tested bi-directionally (up & down), uses `UUID v4`, `timestamptz`, and composite index with `organization_id`.
- [ ] **Validation Commands**: `yarn rules:check`, `yarn lint`, `yarn test`, and `yarn build` executed and passing cleanly.

## Linked Issues
Fixes #<!-- Issue Number -->
