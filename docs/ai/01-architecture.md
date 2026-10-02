# 01. Architecture & Modular Monolith Guidelines

RentMate Server is a NestJS modular monolith designed around vertical slices and strict horizontal layers.

---

## 1. Project Flow & Vertical Slices

- **Vertical Slice Shipping**: Every feature phase ships DB schema + API + tests + background jobs + frontend together. Never build all schemas first then all APIs.
- **Phase Roadmap**:
  1. Foundation (Done)
  2. Auth & RBAC (Done)
  3. Organizations & Properties (NEXT)
  4. Units & Occupancy
  5. Tenants & Leases
  6. Billing & Invoices
  7. Payments
  8. Complaints & Maintenance
  9. Visitors
  10. Notifications
  11. Reports & Dashboard
  12. Security & Audit
  13. Performance & Hardening
  14. Production Deployment
  *Rule*: Do not start a phase until the previous phase's "Done When" criteria are verified in [10-roadmap-and-status.md](docs/ai/10-roadmap-and-status.md).

- **Module Layers**:
  - **L0**: Auth, Authorization, Organizations, Users
  - **L1**: Properties, Units, Beds, Occupancy
  - **L2**: Tenants, Documents, KYC
  - **L3**: Leases
  - **L4**: Invoices, Payments, Expenses, Utilities
  - **L5**: Complaints, Maintenance, Visitors
  - **L6**: Notifications, Templates
  - **L7**: Reports, Dashboard, Audit

- **Dependency Rules**:
  - A module may depend ONLY on modules in the same or lower layers.
  - Upward communication happens ONLY via domain events (`@nestjs/event-emitter`), never direct imports.
  - Within a layer, no circular imports are allowed.
  - **Platform Layer (`core/`, `shared/`, `integrations/`)**: Lives below L0. MUST NEVER import from `modules/`. Transactional system messaging (OTP, invites) lives in `core/notifications/`.

- **Open Product Questions**:
  Open product questions must be asked, never invented. Reference the 18 architectural questions by number (e.g. Q1: Property Types, Q2: Occupancy Models, Q3: Custom Roles, etc.) from the architecture specification when seeking clarification.

---

## 2. Target Canonical Directory Structure

```
src/
  main.ts                     # HTTP bootstrap
  worker.ts                   # BullMQ worker bootstrap
  app.module.ts               # Root API module
  worker.module.ts            # Root worker module
  core/                       # Platform NestJS infrastructure
    config/                   # Typed env config (Zod)
    database/                 # Data source, migrations, seeds, base entities, repositories, TransactionRunner
    tenancy/                  # TenantContext (AsyncLocalStorage)
    http/                     # Envelope, filters, interceptors, middleware, pipes, swagger, decorators
    errors/                   # AppException, ErrorCode
    logger/                   # Pino logger
    redis/                    # Redis client & throttle storage
    queue/                    # BullMQ setup & BaseProcessor
    health/                   # Health checks
    events/                   # Event emitter setup
    notifications/            # Platform transactional notifications facade (OTP, invites)
  shared/                     # Pure TS utilities & types ONLY (cursor, duration, hashing, mask, cookies)
  integrations/               # Ports & Adapters for third-party services
    <capability>/             # e.g., email/, sms/, payments/, storage/
      <capability>.provider.ts# Port (abstract class DI token)
      adapters/               # Concrete vendor adapters (e.g. smtp-email.provider.ts)
  modules/                    # Domain feature modules
    <module>/
      <module>.module.ts      # NestJS module declaration
      index.ts                # PUBLIC API barrel export
      contracts/              # Abstract contract classes for cross-module DI
      controllers/            # HTTP controllers
      dto/                    # Request/response DTOs
      services/               # Business logic & transaction orchestration
      repositories/           # Database repositories
      entities/               # TypeORM entities
      stores/                 # Optional Redis caching repositories
      constants/              # Module constants
      types/                  # Module types
      tests/                  # Unit (*.spec.ts) and integration (*.int-spec.ts) tests
test/
  e2e/                        # End-to-end HTTP tests
tools/                        # Scripts & verification tools (check-rules.ts)
docs/                         # Architecture, AI rules, ADRs
```

---

## 3. Step-by-Step Recipe: Adding a New Module

> *Note*: Generator CLI commands (`yarn gen module <name>`) will exist after the structure reorganization task. Until then, execute this recipe manually:

1. Create module folder: `src/modules/<name>/`.
2. Add module file: `src/modules/<name>/<name>.module.ts`.
3. Add public API barrel: `src/modules/<name>/index.ts`. Export ONLY the module class, contract abstract classes, public types, and public DTO types.
4. Add internal subdirectories: `controllers/`, `dto/`, `services/`, `repositories/`, `entities/`, `contracts/`, `tests/`.
5. If exposing services to other modules, define an abstract contract in `contracts/<name>-contract.ts` and register provider: `{ provide: ContractClass, useExisting: InternalService }`.
6. Import the module into `src/app.module.ts`.

---

## 4. Do & Don't Block

```ts
// DO: Import cross-module contracts strictly via public index.ts
import { UserDirectory } from 'src/modules/users';

// DON'T: Import internal services or repositories directly across modules
import { UserService } from 'src/modules/users/services/user.service'; // BAD!
import { UserRepository } from 'src/modules/users/repositories/user.repository'; // BAD!

// DO: Use domain events for upward layer communication
this.eventEmitter.emit('lease.created', new LeaseCreatedEvent(leaseId));

// DON'T: Import a higher-layer service into a lower-layer module
// L1 Properties module importing L3 Leases module service -> VIOLATION!
```
