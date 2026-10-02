---
applyTo: "**/tests/**"
---

# Testing Scope Instructions

- Unit tests (`*.spec.ts`) use fake in-memory repositories. DO NOT mock TypeORM internal methods.
- Integration tests (`*.int-spec.ts`) execute against real Postgres and include cross-tenant isolation checks.
- E2E tests (`test/e2e/*.e2e-spec.ts`) test full HTTP flows and MUST include an IDOR test per resource.
- Follow Arrange-Act-Assert (AAA) structure and use descriptive test titles ("should ... when ...").
- Never leave skipped (`it.skip`) or focused (`fit`/`fdescribe`) tests.
- Full details: [06-testing.md](docs/ai/06-testing.md)
