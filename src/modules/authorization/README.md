# authorization

Phase 2 provides deny-by-default route guards, role/permission catalogs, organization/property scope checks and a single cached permission-context loader. JwtAuthGuard depends on SessionVerifier; context loading uses user and organization directories. Role mutations invalidate the Redis context through version-checked cache writes.

See [Phase 2 report](../../../docs/ai/17-phase2-report.md) for contracts, zero-query warm-context tests and concurrency checks.
