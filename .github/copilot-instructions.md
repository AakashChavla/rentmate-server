# RentMate Server Copilot Instructions

Follow the canonical non-negotiable engineering standards for `rentmate-server`.

## Key Non-Negotiables
1. **Module Monolith & Layering**: Follow the strict layer sequence L0 -> L1 -> L2 -> L3 -> L4 -> L5 -> L6 -> L7. Platform layer (`core/`, `shared/`, `integrations/`) NEVER imports from `modules/`.
2. **Public API Contracts**: Cross-module imports are restricted to `modules/<module>/index.ts` and abstract contract tokens in `contracts/`.
3. **Multi-Tenancy**: `organization_id` comes strictly from verified JWT via `TenantContext`. All tenant queries use `TenantScopedRepository` with `organization_id = :orgId`. Cross-tenant lookups return 404 NOT_FOUND.
4. **Data Access Flow**: Controller -> Service -> Repository -> TypeORM. Services MUST NOT import TypeORM. Controllers MUST NOT call repositories directly.
5. **TypeScript & Style**: Strict mode, no `any`, no default exports, no barrel re-export-all (`export *`), no floating promises.
6. **Git Discipline**: NEVER run `git commit`, `git add`, or `git push` commands unless explicitly requested in the current user prompt.

## Detailed Guides
- Architecture & Monolith Layers: [01-architecture.md](docs/ai/01-architecture.md)
- Code Style & Naming: [02-code-style-and-naming.md](docs/ai/02-code-style-and-naming.md)
- Data Access & Tenancy: [03-data-access-and-tenancy.md](docs/ai/03-data-access-and-tenancy.md)
- Integrations (Ports & Adapters): [04-integrations.md](docs/ai/04-integrations.md)
- API Conventions: [05-api-conventions.md](docs/ai/05-api-conventions.md)
- Testing Strategy: [06-testing.md](docs/ai/06-testing.md)
- Security & Logging: [07-security-and-logging.md](docs/ai/07-security-and-logging.md)
- Git & Workflow: [08-git-and-workflow.md](docs/ai/08-git-and-workflow.md)
- Reusable Catalog: [11-reusable-catalog.md](docs/ai/11-reusable-catalog.md)
