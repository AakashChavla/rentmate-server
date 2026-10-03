# Architecture

Use the binding Phase 0 charter before ../docs/architecture.html. RentMate serves hotels, PGs/hostels, apartments and flats; INR and Asia/Kolkata are the defaults. Both repositories ship each feature together: server implementation, OpenAPI export, generated client types, client implementation.

## Server boundaries

Controller -> Service -> Repository -> TypeORM. Core is infrastructure; shared is pure TypeScript; integrations contain ports and vendor adapters; modules contain business capabilities.
Module layers: L0 auth/authorization/organizations/users; L1 properties/units/beds/occupancy; L2 tenants/documents/kyc; L3 leases; L4 invoices/payments/expenses/utilities; L5 complaints/maintenance/visitors; L6 notifications/templates; L7 reports/dashboard/audit. Depend on the same or a lower layer; communicate upward through events. Platform never imports modules. No cycles or forwardRef.
Every service, repository, store and integration has an abstract DI port. Bind with useClass. Consumers inject only ports. Use DefaultUserService, TypeOrmUserRepository, RedisPermissionContextStore and SmtpEmailProvider for implementations. Export contracts through module index.ts only.

## Client boundaries

App routes compose features. Features expose index.ts; deep cross-feature imports are forbidden. UI primitives never import features. HttpClient/FetchHttpClient and resource interfaces are supplied by ServicesProvider. Use server components unless interaction needs a client component.

## Lifecycle

Follow the reference phases 1-14, shipping vertical slices. Phase 0 establishes the tools and compiling examples; it does not implement authentication or rental workflows.
