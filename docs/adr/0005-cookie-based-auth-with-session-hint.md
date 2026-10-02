# ADR 0005: Cookie-Based Authentication with Presence Session Hint

* **Status**: Accepted
* **Date**: 2026-09-19
* **Deciders**: Security Architect, Frontend Lead

## Context and Problem Statement
RentMate uses a decoupled API (`rentmate-server`) and Next.js frontend (`rentmate-client`). Storing access/refresh JWT tokens in browser LocalStorage exposes tokens to Cross-Site Scripting (XSS) attacks. Furthermore, the Next.js server-side middleware needs a non-sensitive mechanism to detect authentication state without parsing HTTP-only tokens on every static asset request.

## Decision Drivers
* Protection against XSS token exfiltration.
* Smooth server-side rendering (SSR) and Next.js middleware authentication checks.
* Transparent session rotation and immediate revocation handling.

## Considered Options
1. Bearer tokens in Authorization header stored in browser `localStorage`.
2. Pure HTTP-only cookies (`rm_access` and `rm_refresh`) with no client visibility.
3. Dual-cookie architecture: HTTP-only secure JWT cookies (`rm_access`, `rm_refresh`) + JS-accessible presence hint cookie (`rm_session`).

## Decision Outcome
Chosen option: "Dual-cookie architecture: HTTP-only secure JWT cookies + JS-accessible presence hint cookie", because it secures JWT tokens from XSS while enabling Next.js middleware routing decisions.

### Cookie Specifications
1. `rm_access`: HTTP-only cookie scoped to `/`. Holds short-lived Access JWT (`sub`, `org`, `fid`). TTL: 15 minutes.
2. `rm_refresh`: HTTP-only cookie scoped strictly to `/api/v1/auth`. Holds Refresh JWT (`sub`, `org`, `fid`, `jti`). Rotated on every refresh call. TTL: 7 days.
3. `rm_session`: Non-HTTP-only cookie scoped to `/`. Holds static string `"1"`. Acts purely as a presence hint for Next.js middleware routing. Contains no tokens or PII.

### Positive Consequences
- Access and refresh tokens are completely immune to JavaScript XSS exfiltration.
- Next.js frontend can immediately check `rm_session` presence without making network calls.
- Session reuse detection invalidates the entire token family on refresh token reuse.

### Negative Consequences
- Requires CORS credential support (`credentials: true`) and parent domain cookie scope configuration in production (`COOKIE_DOMAIN`).
