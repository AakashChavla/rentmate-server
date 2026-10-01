# RentMate — Architecture & Flow (from the PropFlow doc)

Source of truth for scope and order. Anything not in the current phase is out of scope.

## Style
Modular monolith (NestJS). Shared DB, shared schema, `organization_id` on every tenant row, enforced in the repository layer and by indexes. Vertical slices per phase (API + DB + tests + jobs together). Each module can be extracted later; cross-module calls go through exported services / domain events.

## Domain
Organization → Property (HOTEL | PG | APARTMENT | INDIVIDUAL_FLAT) → [Block/Wing] → [Floor] → Unit (rentable) → [Bed] → Lease → Tenant.
A Unit (or Bed) is the universal rentable entity; Lease, Invoice, Payment and Complaint all point to it.

## RBAC
Two axes: **role** (what) × **scope** (where: ORGANIZATION | PROPERTY). Permissions are `resource:action` strings checked by guards. Roles: SUPER_ADMIN, ORG_OWNER, PROPERTY_MANAGER, ACCOUNTANT, RECEPTIONIST, MAINTENANCE_STAFF, SECURITY_STAFF, TENANT.

## Request flow
`Request → RequestId middleware → JwtAuthGuard (cookie rm_access) → PermissionsGuard → ValidationPipe → Controller → Service → Repository → DB`, then `ResponseEnvelopeInterceptor` → `{ success, data, meta }`; errors → `AllExceptionsFilter` → `{ success:false, error:{ code, message, details }, meta }`.

## Async flow
Service (after commit) → `NotificationService` / `DomainEventBus` → BullMQ queue → processor (worker process) → integration port → adapter (SMTP, later Razorpay/SMS/WhatsApp/S3).

## Layers
```
Controller → Service → Repository → DB
Service → Integration port (email, payment, sms, storage)   [adapter hidden behind env]
Service → DomainEventBus / CachePort                         [infra ports]
```
Module layers (lower never imports higher): L0 auth, authorization, organizations, users · L1 properties, units, tenants · L2 leases · L3 invoices, payments · L4 complaints, visitors, notifications, reports, audit.

## Phases
| # | Phase | Status |
|---|-------|--------|
| 1 | Foundation (scaffold, DB, Redis, BullMQ, health, CI) | done |
| 2 | Auth + RBAC (+ SMTP email, OTP) | done |
| 2.5 | Hygiene: structure, repository layer, internal abstractions, rules | **now** |
| 3 | Organizations + Properties + invites | next |
| 4 | Floors, Units, Beds, occupancy | |
| 5 | Tenants, KYC documents, Leases | |
| 6 | Invoices, billing rules, PDF | |
| 7 | Payments (Razorpay, webhooks, receipts) | |
| 8 | Complaints + maintenance | |
| 9 | Visitors | |
| 10 | Notifications (SMS, WhatsApp, FCM, templates) | |

MVP = phases 1–7 + email notifications.

## Key business rules to remember
- Cannot double-book a unit (lease overlap prevention, DB constraint + service check).
- Webhooks are idempotent (UNIQUE `gateway_txn_id`).
- Cursor pagination for large lists; offset only for tiny lists.
- Error codes are machine-readable (`LEASE_OVERLAP`, `UNIT_OCCUPIED`).
- Aadhaar/KYC storage is regulated: do not store full Aadhaar numbers without a product/legal decision (open question).

## Open product questions blocking Phase 3+
Property type for MVP (Q1), who approves tenants (Q9), self-serve vs sales-led signup (Q17), tenant portal domain vs path (Q12). Ask before building anything that depends on them.
