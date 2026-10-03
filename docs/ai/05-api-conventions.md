# API and two-repository contract

Server docs/openapi.json is authoritative. Every phase runs server work -> yarn openapi:export -> client yarn api:types -> client work. The client must not invent endpoints.
Success: {success,data,meta:{requestId,timestamp,page?}}. Error: {success:false,error:{code,message,details},meta:{requestId}}. Keyset page: {limit,hasNext,nextCursor}; use created_at/id and MAX_PAGE_SIZE.
Stable error codes, locales (en/hi), cookie names (rm_access, rm_refresh, rm_session, NEXT_LOCALE), envelope and pagination change in both repos together. Tokens remain httpOnly. Health routes are outside the versioned API/envelope.
Phase 0 offers GET /health/live only and exports its actual OpenAPI document. Database readiness, auth and domain endpoints arrive in subsequent phases.

## Phase 1 contract

GET /health/live and /health/ready are public, unwrapped probes outside /api/v1. Readiness requires both PostgreSQL and Redis. Swagger cookie security documents future rm_access usage; it does not create authentication endpoints. Swagger defaults on in development and off in production. Public and SkipEnvelope are independent metadata decorators.

Business response/validation/error envelopes and keyset cursor helpers are implemented and exercised by test-only HTTP routes. No domain route is invented. The single-flight client refresh coordinator remains disabled until Phase 2 defines the actual refresh endpoint.
