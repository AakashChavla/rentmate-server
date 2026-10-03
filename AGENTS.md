# RentMate engineering charter

Read docs/ai/10-roadmap-and-status.md before work. Follow the latest user phase request over the reference architecture document.

## C1 Two-repo contract

Ship server -> OpenAPI export -> client type generation -> client work. Keep envelopes, pagination, error codes, locales and cookie names synchronized. Never invent missing endpoints.

## C2 Architecture and abstraction

Server: core/shared/integrations/modules. Controller -> Service -> Repository -> TypeORM. Platform never imports modules. Depend on the same/lower L0-L7 layer; upward communication uses events. Cross-module imports use index.ts and contracts only. No forwardRef or cycles.
Every service/repository/store/integration has an abstract DI port; bind useClass. Consumers inject only ports. Name implementations Default*, TypeOrm*, Redis* or vendor names. Tests inject handwritten fakes.
Client: app/features/components/lib/config/providers/test. Pages stay thin, features import public index.ts, UI primitives never import features. Inject HttpClient/resource APIs through ServicesProvider. Fetch only in API files. Server Components by default.

## C3 Constants

Put meaningful literals in constants/enums/catalogs; validated env controls tunables. Use HttpStatus, durations, route/query/cache-key builders and design/motion tokens. No magic numbers, inline string comparisons/switch cases or raw Error messages outside permitted constants/tests/catalogs. AppException takes ErrorCode.

## C4 Localization

Support en/hi and typed catalogs. Resolve user -> preference cookie/header -> org -> en. Translate errors/validation/emails/documents and UI; use Intl and logical CSS classes. Run i18n:check for key parity, placeholders and unused keys. Record assistant-authored Hindi for review.

## C5 Security

Never read/print/commit secrets. Validate inputs, use verified JWT tenant identity, httpOnly cookies, Origin CSRF checks, Argon2id and rate limits. Mask PII, redact Pino logs, never leak internals. Guard outbound URLs/uploads when implemented. Require nonce CSP; no dangerouslySetInnerHTML. Run audit/Gitleaks/CodeQL.

## C6 Scalability

Stateless API/workers; shared state in Postgres/Redis. Idempotent jobs/money, configured concurrency, stable scheduler IDs, keyset pagination, org-leading indexes, batch queries, timeouts/retries, bounded caches and expand/contract migrations.

## C7 UI and motion

Use CSS design tokens, indigo/teal and slate, AA contrast, light/dark, rounded cards and inline SVG. Lazy-load motion; animate transform/opacity using MOTION tokens and reducedMotion=user. Avoid layout shift.

## C8 Quality

Strict TypeScript, no any/console/floating promises; max 300 lines/file, 50 lines/function, complexity 10. No undocumented TODO. Run yarn verify:quick and applicable yarn verify infrastructure suites. Prove new gates with temporary violations. Test validation, permissions, isolation and races as capabilities ship. Reuse cataloged helpers.

## C9 Git

Work on phase/0-charter, then phase/<n>-<slug> from the previous phase. Conventional Commits per logical step. Never push/amend/rewrite history or change remotes. Legacy snapshots/tags stay intact.
Pointers stay short and link to docs/ai. CLAUDE.md starts @AGENTS.md. rules:check enforces resolving references and <=10000-character files. Husky runs rules:check and lint-staged.

## Commands and done

Use Node 20.20.2 and Corepack Yarn 1.22.22. Run yarn install, yarn dev, yarn verify:quick, yarn verify, yarn rules:proof, yarn gen and yarn format. Both repos must compile and pass quick verification; report unverified external services exactly.

- [01-architecture](docs/ai/01-architecture.md)
- [02-code-style-and-naming](docs/ai/02-code-style-and-naming.md)
- [03-data-access-and-tenancy](docs/ai/03-data-access-and-tenancy.md)
- [04-integrations](docs/ai/04-integrations.md)
- [05-api-conventions](docs/ai/05-api-conventions.md)
- [06-testing](docs/ai/06-testing.md)
- [07-security-and-logging](docs/ai/07-security-and-logging.md)
- [08-git-and-workflow](docs/ai/08-git-and-workflow.md)
- [09-review-checklist](docs/ai/09-review-checklist.md)
- [10-roadmap-and-status](docs/ai/10-roadmap-and-status.md)
- [11-reusable-catalog](docs/ai/11-reusable-catalog.md)
- [12-localization](docs/ai/12-localization.md)
