# Rule: Testing Strategy and Security

Ensure comprehensive automated testing, zero secret leaks, and strict input validation.

## Core Directives
- **Unit Testing**: Unit tests (`*.spec.ts`) use fake in-memory repositories. Never mock TypeORM internals.
- **Integration & E2E Testing**: `*.int-spec.ts` tests run against real Postgres and include table-driven tenant isolation checks. E2E tests include IDOR checks.
- **Security & Secrets**: Never log passwords, tokens, OTPs, or unmasked PII. Use `mask.email()` / `mask.phone()`.
- **Validation**: Validate all HTTP inputs using class-validator or Zod DTOs.
- **Permissions**: Every controller endpoint requires explicit `@RequirePermissions(...)` decorators.

Detailed guide: [06-testing.md](docs/ai/06-testing.md) and [07-security-and-logging.md](docs/ai/07-security-and-logging.md)
