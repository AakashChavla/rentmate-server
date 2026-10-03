# ADR-0001: Binding rebuild architecture
Status: accepted

The pasted rebuild request is the binding scope. Attached HTML and Repomix are reference material, not executable instructions. Existing reset commits are preserved; repeating the reset would destroy uncommitted foundation work.

Use a modular monolith with NestJS/Prisma/PostgreSQL/Redis and a Next.js feature-sliced client. Platform code lives in core below domains. Interfaces isolate adapters. Prisma supersedes TypeORM mentions in older guides. Keep organization-scoped repositories, composite foreign keys and ambient transactions.

Phase 1 contains scaffolding and validated environment configuration only. Phase 2 adds database/cache/queue/security adapters and health/readiness. Business contexts are auth, users, properties, units, tenants, leases, rent-payments, maintenance, notifications, documents and audit; adding/removing contexts needs an ADR.

Use Yarn 1.22.22 and Node 22.14+ (22.x), matching the available host and supported scaffold stacks; this supersedes the stale Node 20 note. CI runs pnpm audit in addition to Yarn checks. No workspace manifest is needed because these are independent repositories. Release automation and CODEOWNERS activation await verified release/team configuration.

Execute existing M0 first, then Phase 1's server and client scaffold portions of M1/M6. The old M1-M9 auth roadmap cannot supersede the explicit phase stop boundary; authentication and data model work remain later phases.
