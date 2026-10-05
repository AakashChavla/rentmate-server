# Reusable catalog

## Server platform

- Clock/SystemClock and IdGenerator/UuidIdGenerator; handwritten fakes in src/test.
- AppConfigService: Zod environment validation, typed configuration and centralized headers, cookies, queues, limits, cache keys and durations.
- RequestContext and TenantContext: AsyncLocalStorage scopes. TenantScopedRepository composes TenantRepository; TypeOrmTenantRepository stamps organization identity and scopes reads/updates. GlobalRepository closes the authentication escape reason union.
- DatabaseConnection/TypeOrmDatabaseConnection; TransactionRunner/DefaultTransactionRunner joins ambient transactions and marks nested failures rollback-only.
- KeyValueStore/RedisKeyValueStore supports atomic expiring counters. QueuePublisher/BullQueuePublisher and WorkerHost/BullWorkerHost share bounded retry/retention defaults. EventBus wraps EventEmitter2.
- Public/SkipEnvelope decorators, response interceptor, localized exception/validation handling, request IDs, Origin protection and atomic throttling.
- Cursor, PaginatedResult, readiness, migration runner, OpenAPI exporter and repository-method isolation harness.

## Client platform

- HttpClient/FetchHttpClient, ApiError, enabled single-flight refresh, HealthApi and injectable ServicesProvider; QueryProvider supplies retry/stale-time policy.
- Button, Input, Label, Card, Form, Dialog, DropdownMenu, Sheet, Table, Badge, Skeleton, Avatar, Separator, Sonner, Tabs, Select, InputOTP, Tooltip, Progress and Accordion primitives.
- PageHeader, EmptyState, DataTable, ConfirmDialog, StatusBadge, CurrencyText, DateText, InputField, AnimatedNumber, StaggeredList and PageTransition.
- ThemeProvider, MotionProvider, ThemeToggle, LanguageSwitcher, route/nav configuration and bilingual catalogs.
- AdminShell, TenantShell, AuthLayout, landing composition and localized route placeholders.

## Phase 2 additions

AuthService, SessionService/Verifier/Revoker, OtpService, LoginLockout, PermissionContextLoader/Store/Checker, UserDirectory/Repository/Service and OrganizationDirectory/Repository have abstract ports. Reuse AuthCookies, SecurityEventLogger, ExternalCallPolicy, ValidatedBody/Query, transaction afterCommit, repository reflection fixtures and scoped role batches. Argon2, jose, crypto OTP, SMTP, email blocklist and none-bot adapters are bound through root wiring.

Client AuthProvider, AuthApi/UsersApi, PermissionGate/useCan/useHasPermission, AuthGuard/RequirePermission, safe-next/home routing, countdown/submission helpers, labeled OTP/identity fields and user filter/dialog components are reusable. Business-domain capabilities remain future phases.
