# auth

Phase 2 implements registration, verification, password and OTP login, recovery, cookie sessions, atomic refresh rotation and revocation. Controllers use abstract services; scoped repositories store token hashes and OTP HMACs. SessionVerifier and SessionRevoker are the cross-module contracts. Root IdentityModule binds implementations without cycles.

See [Phase 2 report](../../../docs/ai/17-phase2-report.md) and [refresh ADR](../../../docs/adr/0007-atomic-refresh-rotation.md) for endpoints, security decisions and verification.
