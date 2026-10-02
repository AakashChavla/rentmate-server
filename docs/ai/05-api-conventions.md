# 05. API Conventions & HTTP Standardizations

This document defines route prefixes, response/error envelopes, pagination, filter queries, idempotency, and data types across RentMate API.

---

## 1. Route Prefixes & Envelopes

- **Global Prefix**: All API endpoints use `/api/v1`.
- **Health Probes**: `/health/live` and `/health/ready` operate outside the global prefix and envelope.

### Success Response Envelope
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "req_123456789",
    "timestamp": "2026-10-02T10:00:00.000Z",
    "page": {
      "nextCursor": "eyJjcmVhdGVkQXQiOiIyMDI2LTEwLTAxVDEyOjAwOjAwWiIsImlkIjoiYWJjIn0=",
      "prevCursor": null,
      "hasNextPage": true,
      "limit": 20
    }
  }
}
```

### Error Response Envelope
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid query parameters provided",
    "details": [
      { "field": "status", "message": "status must be a valid enum value" }
    ]
  },
  "meta": {
    "requestId": "req_123456789"
  }
}
```

---

## 2. Pagination & Filtering Standards

- **Keyset Cursor Pagination**: Used for all large dynamic collections (audits, invoices, payments, messages). Performs keyset filtering on `(created_at, id)`. Returns `PaginatedResult<T>`.
- **Offset Pagination**: Allowed ONLY for small, fixed static reference lookups (e.g. roles, permissions list).
- **Filtering & Sorting Query DTOs**: Validated query DTOs format: `?status=ACTIVE&sort=created_at:desc`.

---

## 3. Idempotency & Data Types

- **Idempotency Keys**: Financial and non-idempotent operations (payment processing, invoice generation) require the `Idempotency-Key` HTTP header.
- **Money Values**: Database columns and DTOs handle monetary values as `NUMERIC(12,2)`. Never use floating point numbers for currency calculations.
- **Primary Keys**: UUID v4 generated via PostgreSQL `gen_random_uuid()`.
- **Timestamps**: All dates/times MUST use `timestamptz`.
- **Soft Deletes**: Use soft deletes (`deleted_at timestamptz`) where specified by business domain requirements.

---

## 4. Step-by-Step Recipe: Adding an API Endpoint

1. Create or update request DTO (`dto/create-<resource>.dto.ts`) and query DTO with `class-validator` / `Zod` decorators.
2. Define response DTO with Swagger `@ApiProperty()` annotations.
3. Add controller method in `controllers/<resource>.controller.ts`:
   - Annotate with HTTP method (`@Get()`, `@Post()`, etc.).
   - Add permission guard: `@RequirePermissions('resource:action')`.
   - Add Swagger annotations (`@ApiOperation()`, `@ApiResponse()`).
4. Delegate logic to Service method (`services/<resource>.service.ts`).
5. Add controller unit test (`tests/<resource>.controller.spec.ts`) and E2E IDOR test in `test/e2e/`.

---

## 5. Do & Don't Block

```ts
// DO: Use validated query DTO and return response envelope
@Get()
@RequirePermissions('property:read')
async listProperties(
  @Query() query: ListPropertiesQueryDto,
): Promise<PaginatedResult<PropertyDto>> {
  return this.propertyService.listProperties(query);
}

// DON'T: Unvalidated query params or custom raw response structure
@Get()
async getProperties(@Req() req: any) { // BAD! Unvalidated req, no permission guard
  return { properties: [] }; // BAD! Bypasses standardized response envelope
}
```
