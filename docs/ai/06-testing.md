# Testing and quality gates

yarn verify:quick runs lint, typecheck, arch:check, rules:check, i18n:check, unit tests and build. Server yarn verify additionally includes real PostgreSQL integration and PostgreSQL/Redis e2e suites when their phase is implemented; do not mark unavailable suites green. Client verify equals verify:quick.
Use Jest on the server and Vitest on the client. Unit tests use hand-written fakes, never TypeORM mocks. Every endpoint needs validation, permissions and tenant-isolation coverage as applicable; the public liveness endpoint has HTTP/localization coverage.
Prove every configured lint/architecture/localization gate using temporary fixtures, require a nonzero exit and expected diagnostic, restore/remove fixtures in finally and rerun the clean baseline.
Future race suites cover refresh rotation, OTP attempt reservations and last-owner protection. Add query-count tests for cached authorization/batch loading. Do not add skipped/focused tests.

## Phase 1 verification

Server yarn verify runs strict lint/types/boundary/pointer/auth-escape/localization gates, unit tests, Nest HTTP e2e, build and real Postgres/Redis integration tests. Integration tests use a dedicated fixture database: sample tenant/transaction tables are created and dropped; do not point the suite at production. No database-drop operation is used. The reflection harness rejects repository methods without registered isolation cases.

Client yarn verify runs strict gates, Vitest/RTL/MSW/jest-axe tests and the Next production build. Tests cover both landing locales, persistent language preference, reduced-motion policy, shell permissions, transport errors and disabled refresh. jsdom axe excludes color contrast; visual/browser review remains a separate check.

Run yarn rules:proof to introduce temporary violations and confirm gate rejection; fixtures are removed in finally blocks. Remote CI, CodeQL and Gitleaks require independent evidence before claiming success.
