# Phase 0 charter and ports

## Status

Accepted on 2026-10-03.

## Context

The former scaffolds used Prisma/Biome/Next 15 and lacked consistent ports and localization. The binding charter requires NestJS, TypeORM-ready boundaries, ESLint 9 and Next 14.

## Decision

Use abstract Nest DI ports with useClass, injected client interfaces, strict public module/feature APIs, locale catalogs and executable quality gates. Keep the API and worker stateless and add database capabilities in their vertical feature phases.

## Consequences

More explicit bindings and fakes; adapters can change without business logic changes. Phase 0 contains no authentication or rental data access. Do not manufacture success for absent DB/e2e suites.
