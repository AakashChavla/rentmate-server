# ADR 0007: 10-Second Grace Window for Refresh Token Rotation

* **Status**: Accepted
* **Date**: 2026-10-03
* **Deciders**: Security Architect, Backend Lead

## Context and Problem Statement
When client applications issue parallel HTTP requests while an access token is expired, multiple requests may attempt to rotate the refresh token simultaneously using the same refresh cookie. Strictly invalidating the token family on the second parallel request causes false-positive session revocation for legitimate concurrent clients.

## Decision Drivers
* Prevent false-positive session logouts under network latency and parallel client requests.
* Maintain strict security guarantees against actual refresh token reuse attacks.
* Ensure race condition safety during token rotation.

## Considered Options
1. Immediate family revocation on any repeated token presentation.
2. 10-second grace window for previously rotated tokens in the same family returning 401 `TOKEN_ROTATED` without family revocation.
3. Lock refresh tokens in Redis during rotation.

## Decision Outcome
Chosen option: "10-second grace window for previously rotated tokens in the same family returning 401 `TOKEN_ROTATED`", because it prevents client disruptions during legitimate concurrent refresh requests while preserving security against actual reuse outside the grace window.

### Behavior Specification
- An atomic `UPDATE refresh_tokens SET revoked_at = NOW(), replaced_by_id = :next WHERE id = :id AND revoked_at IS NULL AND organization_id = :org` ensures exactly one request succeeds in creating a new successor token.
- If 0 rows are affected (token already revoked):
  - Check if the token was revoked within 10 seconds (`now - revoked_at <= 10s`) and has a `replaced_by_id` set in the same family.
  - If within the grace window, return 401 `TOKEN_ROTATED` without revoking the token family.
  - If outside the grace window, revoke the entire family (`revokeFamily`) and return 401 `SESSION_REVOKED`.
