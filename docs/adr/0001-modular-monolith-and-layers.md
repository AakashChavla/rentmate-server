# ADR 0001: Modular Monolith Architecture & Layer Dependencies

* **Status**: Accepted
* **Date**: 2026-09-15
* **Deciders**: Engineering Lead, Staff Architect

## Context and Problem Statement
RentMate serves multi-tenant property management workflows across properties, units, leases, billing, and maintenance. We need a single codebase deployment that avoids microservices operational overhead while strictly enforcing domain boundaries to prevent monolithic decay ("spaghetti code").

## Decision Drivers
* Rapid iteration speed for single-repo team deployment.
* Clear module boundaries allowing future extraction into microservices if scaling demands it.
* Strict compile-time and architectural boundary guarantees.

## Considered Options
1. Microservices Architecture (independent deployments per domain module).
2. Traditional Layered Monolith (global `services/`, `controllers/`, `entities/` folders).
3. Modular Monolith with Layer-based Dependency Hierarchy (L0 to L7).

## Decision Outcome
Chosen option: "Modular Monolith with Layer-based Dependency Hierarchy", because it combines single-process deployment simplicity with strict, enforced domain boundary isolation.

### Module Layer Hierarchy
- **Platform Layer (`core/`, `shared/`, `integrations/`)**: Infrastructure foundation below L0. Must NEVER import from `modules/`.
- **L0 Foundation**: Auth, Authorization, Organizations, Users.
- **L1 Property Foundation**: Properties, Units, Beds, Occupancy.
- **L2 Customer Foundation**: Tenants, Documents, KYC.
- **L3 Agreements**: Leases.
- **L4 Financials**: Invoices, Payments, Expenses, Utilities.
- **L5 Operations**: Complaints, Maintenance, Visitors.
- **L6 Communications**: Notifications, Templates.
- **L7 Insights & Audit**: Reports, Dashboard, Audit.

### Communication Rules
- Modules can depend strictly on lower or equal layers.
- Upward communication happens ONLY via domain events emitted through `@nestjs/event-emitter`.
- Cross-module logic is accessed strictly through contract abstract classes exported in `modules/<module>/index.ts`.

### Positive Consequences
- Zero distributed system overhead (no network latency between internal modules).
- Strong domain boundary enforcement via NestJS module scoping and public index exports.
- Simplified testing and single-command local development setup.

### Negative Consequences
- Requires strict code reviews and automated rule checks to prevent layer leaking.
