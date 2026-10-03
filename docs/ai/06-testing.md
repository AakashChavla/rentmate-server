# Testing and quality gates

yarn verify:quick runs lint, typecheck, arch:check, rules:check, i18n:check, unit tests and build. Server yarn verify additionally includes real PostgreSQL integration and PostgreSQL/Redis e2e suites when their phase is implemented; do not mark unavailable suites green. Client verify equals verify:quick.
Use Jest on the server and Vitest on the client. Unit tests use hand-written fakes, never TypeORM mocks. Every endpoint needs validation, permissions and tenant-isolation coverage as applicable; the public liveness endpoint has HTTP/localization coverage.
Prove every configured lint/architecture/localization gate using temporary fixtures, require a nonzero exit and expected diagnostic, restore/remove fixtures in finally and rerun the clean baseline.
Future race suites cover refresh rotation, OTP attempt reservations and last-owner protection. Add query-count tests for cached authorization/batch loading. Do not add skipped/focused tests.
