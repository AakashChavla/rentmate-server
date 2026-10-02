# 02. Code Style & Naming Conventions

This document establishes strict code style, TypeScript rules, file naming, and identifier conventions for `rentmate-server`.

---

## 1. TypeScript Strictness & Limits

- **No `any`**: The `any` type is strictly forbidden. Use `unknown`, generic parameters, or Zod schemas.
- **Explicit Return Types**: All public methods and exported functions must have explicit return types.
- **No Default Exports**: Use named exports exclusively.
- **No Barrel Re-export-all**: Avoid `export * from './...'`. Explicitly name all exports in barrel files.
- **No Floating Promises**: Every Promise must be explicitly `await`ed or returned.
- **No Sequential Await in Loops**: Avoid `await` inside loops unless sequential processing is strictly required (add an explanatory comment if so). Use `Promise.all` or batch operations.
- **Early Returns**: Prefer guard clauses and early returns to deep nesting.
- **Complexity & Size Limits**:
  - Max ~300 lines per file.
  - Max ~50 lines per function.
  - Cyclomatic complexity <= 10.
  - Exactly ONE exported main class per file.

---

## 2. Naming Conventions

| Category | Format | Example |
| :--- | :--- | :--- |
| **Files** | kebab-case with role suffix | `property-unit.controller.ts`, `lease.service.ts` |
| **Classes** | PascalCase with role suffix | `PropertyUnitController`, `LeaseService` |
| **Interfaces** | PascalCase (NO `I` prefix) | `TenantContext`, `EmailMessage` |
| **Enums** | PascalCase with PascalCase members | `UserRole.PropertyManager`, `LeaseStatus.Active` |
| **Constants** | SCREAMING_SNAKE | `DEFAULT_PAGINATION_LIMIT`, `JWT_ACCESS_TTL` |
| **DB Columns** | snake_case | `organization_id`, `created_at`, `is_active` |
| **API Routes** | lowercase plural kebab-case | `/api/v1/property-units`, `/api/v1/tenant-leases` |
| **Permissions** | `resource:action` | `user:read`, `property:create`, `role:assign` |
| **Error Codes** | SCREAMING_SNAKE in `ErrorCode` enum | `VALIDATION_ERROR`, `TENANT_SCOPE_MISSING` |
| **Queue Names** | `domain.action` | `notification.email`, `invoice.generate` |

### Allowed File Role Suffixes
- `.module.ts`, `.controller.ts`, `.service.ts`, `.repository.ts`, `.store.ts`, `.entity.ts`, `.dto.ts`, `.guard.ts`, `.processor.ts`, `.provider.ts`, `.spec.ts`, `.int-spec.ts`, `.e2e-spec.ts`.

---

## 3. Prettier & Formatting Rules
- Single quotes (`'`)
- 2 spaces indentation
- Print width 100
- Trailing commas in multi-line objects/arrays

---

## 4. Do & Don't Block

```ts
// DO: Strict types, named exports, explicit return type
export async function calculateTax(amount: number): Promise<number> {
  if (amount <= 0) return 0;
  return amount * 0.18;
}

// DON'T: any type, default export, missing return type
export default async function(amount: any) { // BAD!
  return amount * 0.18;
}

// DO: Use Promise.all for independent asynchronous operations
const [user, properties] = await Promise.all([
  this.userRepo.findById(userId),
  this.propertyRepo.listByOwner(userId),
]);

// DON'T: Sequential await in a loop without justification
for (const id of ids) {
  await this.processItem(id); // BAD! Use Promise.all or batch query
}
```
