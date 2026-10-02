# 06. Testing Strategy & Execution Standards

This document establishes the testing taxonomy, execution rules, isolation standards, and coverage requirements for `rentmate-server`.

---

## 1. Test Taxonomy & Boundaries

- **Unit Tests (`*.spec.ts`)**:
  - Located in `modules/<module>/tests/` or alongside target file.
  - Fast, in-memory execution.
  - Repositories MUST be mocked using fake in-memory repositories (e.g. `FakeUserRepository`). DO NOT mock TypeORM internal methods (`createQueryBuilder`, `find`).
- **Integration Tests (`*.int-spec.ts`)**:
  - Executed against real Postgres and Redis containers.
  - Validate custom repository query logic, complex SQL joins, and transaction boundaries.
  - MUST include a table-driven cross-tenant isolation test verifying that query results are strictly isolated by `organization_id`.
- **End-to-End Tests (`test/e2e/*.e2e-spec.ts`)**:
  - Test complete user workflows over HTTP using Supertest.
  - MUST include an Insecure Direct Object Reference (IDOR) test for every new resource endpoint (verifying that Tenant A cannot access Tenant B resources).
- **Contract Tests (`src/integrations/<capability>/tests/*.spec.ts`)**:
  - Standardized test suites executing against all vendor adapter implementations to guarantee port contract compliance.

---

## 2. Execution Rules & Structure

- **Arrange-Act-Assert (AAA)**: Organize every test block clearly into Arrange, Act, Assert sections.
- **Single Behavior per Test**: Each `it(...)` block verifies exactly one behavior.
- **Descriptive Naming**: Use clear titles: `it('should return 404 when resource belongs to another organization', ...)`
- **No Skipped or Focused Tests**: `it.skip`, `fit`, `fdescribe` are strictly forbidden in committed code.
- **Test Data Builders**: Use factory builder functions to instantiate test entities and DTOs with sensible defaults.
- **Coverage Non-Decreasing**: Code coverage MUST NOT decrease on any PR.

---

## 3. Required Endpoint Test Triad

Every new or modified HTTP API endpoint requires three mandatory tests:
1. **DTO Validation Test**: Verifies invalid body/query parameters yield `400 VALIDATION_ERROR`.
2. **Permission Check Test**: Verifies missing permissions yield `403 FORBIDDEN`.
3. **Tenant Isolation Test**: Verifies cross-tenant access yields `404 NOT_FOUND`.

---

## 4. Do & Don't Block

```ts
// DO: Unit test with fake in-memory repository
describe('LeaseService', () => {
  let service: LeaseService;
  let fakeRepo: FakeLeaseRepository;

  beforeEach(() => {
    fakeRepo = new FakeLeaseRepository();
    service = new LeaseService(fakeRepo);
  });

  it('should calculate total rent correctly when active lease exists', async () => {
    // Arrange
    const lease = createTestLease({ rentAmount: 1000 });
    await fakeRepo.save(lease);

    // Act
    const total = await service.calculateRent(lease.id);

    // Assert
    expect(total).toBe(1000);
  });
});

// DON'T: Mock TypeORM internal methods or leave skipped tests
describe('LeaseService', () => {
  it.skip('should work', async () => { // BAD! Skipped test
    const mockQueryBuilder = { where: jest.fn().mockReturnThis() }; // BAD! TypeORM mock
  });
});
```
