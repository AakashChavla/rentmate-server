# API and two-repository contract

Server docs/openapi.json is authoritative. Every phase runs server work -> yarn openapi:export -> client yarn api:types -> client work. The client must not invent endpoints.
Success: {success,data,meta:{requestId,timestamp,page?}}. Error: {success:false,error:{code,message,details},meta:{requestId}}. Keyset page: {limit,hasNext,nextCursor}; use created_at/id and MAX_PAGE_SIZE.
Stable error codes, locales (en/hi), cookie names (rm_access, rm_refresh, rm_session, NEXT_LOCALE), envelope and pagination change in both repos together. Tokens remain httpOnly. Health routes are outside the versioned API/envelope.
Phase 0 offers GET /health/live only and exports its actual OpenAPI document. Database readiness, auth and domain endpoints arrive in subsequent phases.
