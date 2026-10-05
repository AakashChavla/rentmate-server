# users

Phase 2 provides profile updates, tenant-scoped user reads, cursor pagination, status changes and role management. Services enforce owner and permission checks; repositories use targeted organization-scoped updates. UserDirectory exposes identity reads through contracts, with SessionRevoker and PermissionChecker injected through root wiring.

See [Phase 2 report](../../../docs/ai/17-phase2-report.md) for endpoints, isolation tests and limitations.
