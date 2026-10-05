# ADR 0007: Atomic refresh rotation and concurrent-tab grace

Accepted: 2026-10-05.

Access JWTs last 15 minutes; refresh JWTs and the httpOnly presence hint last 30 days. JWTs use HS256 with distinct access/refresh secrets and audiences, an issuer, verified tenant/user identity and a family ID. Permissions stay in the server-side context cache. Only SHA-256 refresh hashes are stored.

A database transaction conditionally updates the presented, unrevoked refresh row and inserts its successor. Exactly one concurrent request can win. A loser rereads the committed row. If it was replaced within 10 seconds, return `401 TOKEN_ROTATED` without revoking the family or clearing cookies. This permits another tab's winning response to update the shared browser cookie. The client coalesces local refresh calls and retries `TOKEN_ROTATED` once after 200 ms.

Reuse outside this grace period revokes every unrevoked row in the family. The transaction commits before Redis revocation markers are written and `401 SESSION_REVOKED` is returned. Throwing inside the transaction would incorrectly roll back the revocation. Access-token guards check family and user markers, which last the access-token lifetime.

Password reset consumes its OTP, updates the scoped password hash and revokes all refresh sessions in one transaction. Password change retains the current family and revokes the others. `TransactionRunner.afterCommit` prevents cache/marker effects from escaping rolled-back transactions. Redis and PostgreSQL are separate systems: a post-commit Redis failure returns an infrastructure error; operators must restore Redis before serving authentication traffic. A durable transactional outbox for guaranteed post-commit effects remains a future reliability improvement.

The real concurrency test launches 20 refreshes: one successor, 19 grace responses, and two rows in the lineage. Delayed reuse revokes the lineage and immediately blocks access. Tests also launch 50 wrong OTP guesses and simultaneous removal attempts by two owners.
