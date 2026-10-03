# 0002 - Phase 1 foundation

Status: accepted. Date: 2026-10-03.

Two independent repositories need a tested platform before authenticated rental workflows. Node 20.20.2, NestJS and Next.js 14 are binding choices.

Keep TypeORM 0.3 and Nest EventEmitter 3 for CommonJS/Jest compatibility. PostgreSQL schema changes use migrations with synchronize=false. TenantScopedRepository composes a low-level adapter with explicit organizationId; AsyncLocalStorage transactions join and propagate rollback-only. The auth lookup escape has a closed reason union and source-location gate.

Migrations execute once before API/worker startup. A non-root Nginx proxy resolves Docker service addresses, permitting three replicas without host-port conflicts or migration races. Tenant client URLs use /tenant/* because route groups do not separate URLs. Navigation permissions remain previews until Phase 2 server-side authorization.

Refresh stays disabled and placeholders avoid invented endpoints. The client preserves validated envelope pagination metadata. Integration tests require a dedicated fixture database. Production server image and client Docker runtime remain unverified; dependency audits block release. Real auth, queue handlers, schedulers and entity registries arrive with consuming feature slices.
