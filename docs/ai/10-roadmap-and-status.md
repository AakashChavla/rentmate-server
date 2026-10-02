# 10. Engineering Roadmap, Phase Status & Technical Debt Deviations

This document tracks the 14 engineering phases, their "Done When" verification criteria, current project status, and recorded architectural deviations in `src/`.

---

## 1. Phase Status & "Done When" Criteria

| Phase | Description | Status | "Done When" Criteria |
| :--- | :--- | :--- | :--- |
| **Phase 1** | Foundation | **DONE** | Config Zod validation, Postgres/TypeORM data source, Redis client, BullMQ base setup, Pino logging, global HTTP filters & envelope, health probes `/health/live` & `/health/ready` operational. |
| **Phase 2** | Auth & RBAC | **DONE** | Argon2id password hashing, HTTP-only JWT cookies (`rm_access`, `rm_refresh`), presence cookie (`rm_session`), session rotation & family revocation, OTP login flow, RBAC permission guards, seeded roles & demo users. |
| **Phase 3** | Organizations & Properties | **NEXT** | Organization creation, sub-domains/slugs, property & building management, property-manager assignment, multi-tenant isolation verified via integration & E2E IDOR tests. |
| **Phase 4** | Units & Occupancy | Planned | Unit management, beds/flat configuration, unit state transitions (Available, Occupied, Under Maintenance), occupancy tracking. |
| **Phase 5** | Tenants & Leases | Planned | Tenant profiles, document attachments (S3/MinIO), lease agreements, digital signature tracking, auto-expiry checks via BullMQ. |
| **Phase 6** | Billing & Invoices | Planned | Automated monthly invoice generation, utility breakdown, tax calculation, overdue status management, PDF receipt generation. |
| **Phase 7** | Payments | Planned | Payment gateway integration (Razorpay/Stripe), webhook signature verification, partial payments, automated reconciliation, payment idempotency. |
| **Phase 8** | Complaints & Maintenance | Planned | Ticket lifecycle (Open, In Progress, Resolved), maintenance staff assignment, priority SLA tracking, complaint attachment uploads. |
| **Phase 9** | Visitors | Planned | Visitor pass generation, QR code entry validation, security staff gate check-in/check-out logs, host approval notifications. |
| **Phase 10** | Notifications | Planned | Multi-channel messaging (SMS, WhatsApp, FCM Push, Email), user preference suppression matrix, template rendering, in-app inbox. |
| **Phase 11** | Reports & Dashboard | Planned | Financial reports, occupancy analytics, revenue forecasting, PDF/CSV export jobs, cache-backed dashboard widgets. |
| **Phase 12** | Security & Audit | Planned | Comprehensive audit logging for all mutations, rate-limiting hardening, security header audit, PII encryption verification. |
| **Phase 13** | Performance & Hardening | Planned | Database index tuning, Redis caching layer optimization, load testing under 10k requests/sec, memory leak audit. |
| **Phase 14** | Production Deployment | Planned | Multi-region deployment, CI/CD automated pipeline, zero-downtime database migration strategy, production monitoring & alert rules. |

---

## 2. Recorded Current Deviations (To Be Fixed in Next Restructure Task)

The rules in this rulebook describe the **TARGET** structure. The following deviations exist in the current codebase and will be refactored by the subsequent code restructuring task:

1. **Top-Level `src/common/` Directory**:
   - *Current*: Infrastructure code (base entities, tenancy context, decorators, filters, interceptors, middleware, pipes, swagger helpers, utils) is located in `src/common/`.
   - *Target*: Will be relocated into `src/core/http/`, `src/core/database/`, `src/core/tenancy/`, `src/core/errors/` and `src/shared/`.

2. **Top-Level Infrastructure Folders**:
   - *Current*: `src/queues/`, `src/logger/`, `src/health/`, `src/redis/`, and `src/config/` exist at top-level `src/`.
   - *Target*: Will be moved into `src/core/` (`src/core/queue/`, `src/core/logger/`, `src/core/health/`, `src/core/redis/`, `src/core/config/`).

3. **Module Public API Barrel Files (`index.ts`)**:
   - *Current*: `src/modules/*` folders do not currently possess `index.ts` public API barrel files or `contracts/` folders for cross-module interface declarations.
   - *Target*: Each module will expose a clean `index.ts` barrel exporting its module class, contract abstract classes, and public types.

4. **Module Folder Structure**:
   - *Current*: Module code is partially flat inside `src/modules/<module>/`.
   - *Target*: Subdirectories (`controllers/`, `dto/`, `services/`, `repositories/`, `entities/`, `contracts/`, `tests/`) will be created for each active module.

---

## 3. Do & Don't Block

```ts
// DO: Reference current phase and status before starting new work
// Currently Phase 3 (Organizations & Properties) is NEXT.

// DON'T: Attempt to fix application code structure in this documentation task
// A separate task will perform code refactoring based on this recorded status.
```
