# ADR 0006: Keyset Cursor Pagination for High-Volume Endpoints

* **Status**: Accepted
* **Date**: 2026-09-20
* **Deciders**: Backend Lead, Database Engineer

## Context and Problem Statement
RentMate datasets (audit logs, invoices, payments, messages, tenant listings) will grow to millions of rows per organization. Traditional offset pagination (`OFFSET 100000 LIMIT 50`) degrades in database performance over large offsets because PostgreSQL must scan and discard all preceding offset rows. Offset pagination also suffers from page drift when items are inserted or deleted concurrently.

## Decision Drivers
* Constant `O(1)` query execution performance regardless of page depth.
* Elimination of page drift during concurrent row creation/deletion.
* Standardized API response format for infinite scrolling and paginated tables.

## Considered Options
1. Traditional Offset Pagination (`page` and `limit` with SQL `OFFSET`).
2. Keyset Cursor Pagination on `(created_at, id)`.
3. Hybrid Approach: Keyset cursor pagination for large dynamic collections; offset pagination reserved ONLY for small, fixed-size static lookups.

## Decision Outcome
Chosen option: "Hybrid Approach: Keyset cursor pagination for large dynamic collections; offset pagination reserved ONLY for small, fixed-size static lookups", because it ensures scalable performance across all primary API list endpoints.

### Cursor Architecture Rules
- Cursor strings are opaque base64-encoded JSON representations of `[createdAt, id]`.
- Database query uses indexed tuple comparison: `WHERE (created_at, id) < (:lastCreatedAt, :lastId) ORDER BY created_at DESC, id DESC LIMIT :limit`.
- Every paginated database table MUST have a composite index starting with `(organization_id, created_at DESC, id DESC)`.
- Paginated API endpoints return `PaginatedResult<T>` with `meta.page = { nextCursor, prevCursor, hasNextPage, limit }`.

### Positive Consequences
- Query response times remain under 10ms even on tables with tens of millions of records.
- Consistent real-time feed updates without duplicated or missed records.

### Negative Consequences
- Users cannot jump directly to an arbitrary page number (e.g. "jump to page 500").
