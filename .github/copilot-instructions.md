# Copilot instructions — RentMate Server

Follow `/AGENTS.md` (single source of truth) and `/docs/architecture.md`.

Quick reminders for suggestions:
- NestJS 11 + TypeORM + PostgreSQL, strict TypeScript, yarn, Jest.
- Controller → Service → Repository. Only `*.repository.ts` may import `typeorm`/`@nestjs/typeorm`.
- Third-party services go behind a port in `src/integrations/<name>/`; business code never imports vendor SDKs.
- Tenant data: extend `TenantScopedRepository`; org id only from `TenantContext` (JWT), never from the request.
- Throw `AppException(ErrorCode, ...)`; DTOs with class-validator + Swagger; no entities in responses.
- Files: `kebab-case.role.ts`; tests in `test/unit|integration|e2e`, fakes in `test/support`.
- No `any`, no `console.log`, no secrets, no new dependency without being asked.
