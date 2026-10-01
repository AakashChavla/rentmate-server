# RentMate Server

Backend for RentMate, a multi-tenant SaaS for hotels, PGs/hostels, apartments, and rental flats. This repository is the NestJS API and worker only. The Next.js frontend lives in the separate `rentmate-client` repository.

Phase 1 is the foundation: configuration, Postgres, Redis, queues, health checks, and the shared HTTP pipeline. Business modules are folders only.

## Prerequisites

- Node.js 20 LTS (`>=20.19.0`)
- Yarn 1.22
- Docker with Compose, for Postgres 16 and Redis 7

This repo uses NestJS 11. That is the Nest release line that still ships CommonJS builds and runs on Node.js 20 with Jest. NestJS 12 is ESM-only, and its CLI requires a newer Node release.

## Setup

```bash
cp .env.example .env
yarn install
```

Start Postgres and Redis, then run the API on the host:

```bash
docker compose up postgres redis -d
yarn migration:run
yarn start:dev
```

Or start the full local stack (Postgres, Redis, API with hot reload, and the worker):

```bash
docker compose up --build
```

The compose file injects development database URLs that point at the `postgres` and `redis` services. Those values are local defaults, not production secrets. Set real `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` values before using this stack anywhere shared.

API: `http://localhost:3000`

Worker (host process, after Postgres and Redis are up):

```bash
yarn worker
```

Production images use the `production` Docker target. The API command is `node dist/main.js`. The worker command is `node dist/worker.js` (`yarn worker:prod` after `yarn build`).

## Scripts

| Script | Purpose |
| --- | --- |
| `yarn start:dev` | API with reload |
| `yarn start:prod` | Run the compiled API |
| `yarn worker` | Worker process, no HTTP server |
| `yarn worker:prod` | Compiled worker |
| `yarn build` | Compile to `dist/` |
| `yarn lint` | ESLint |
| `yarn test` | Jest unit tests |
| `yarn test:e2e` | API tests against Postgres and Redis |
| `yarn seed` | Idempotent permissions, roles, platform admin, and development demo users |
| `yarn migration:generate` | Generate a TypeORM migration from entity changes |
| `yarn migration:run` | Apply migrations |
| `yarn migration:revert` | Roll back the last migration |

`synchronize` is off. Schema changes go through migrations.

## Folder structure

```
src/
  main.ts                 HTTP entry
  worker.ts               BullMQ worker entry
  app.module.ts
  worker.module.ts
  config/                 Zod env validation and typed config
  common/
    base/                 BaseEntity, TenantBaseEntity, TenantRepository, TenantContext
    decorators/           @CurrentUser and @Public placeholders
    filters/              Global exception filter
    interceptors/         Response envelope and request logging
    middleware/           Request id
    pipes/                Validation pipe
    utils/                Cursor pagination and cookie flags
  database/               Data source, migrations, seeds
  redis/                  ioredis client and throttler storage
  queues/                 BullMQ queues and base processor
  health/                 Liveness and readiness
  logger/                 Pino
  modules/                Feature modules (empty until later phases)
test/                     Unit tests
```

## Environment

Copy `.env.example` to `.env` or `.env.local`. `.env.local` overrides `.env`. The process exits on startup when required values are missing or invalid.

| Variable | Required | Notes |
| --- | --- | --- |
| `NODE_ENV` | no | `development` (default), `test`, or `production` |
| `PORT` | no | Default `3000` |
| `DATABASE_URL` | yes, or the `DB_*` set | `postgresql://...` |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | the set is required when `DATABASE_URL` is empty | `DATABASE_URL` wins when both are set |
| `REDIS_URL` | yes | `redis://` or `rediss://` |
| `JWT_ACCESS_SECRET` | yes | At least 16 characters |
| `JWT_REFRESH_SECRET` | yes | At least 16 characters, different from the access secret |
| `JWT_ACCESS_TTL` | no | Default `15m` |
| `JWT_REFRESH_TTL` | no | Default `7d` |
| `CORS_ORIGIN` | no | Comma-separated list. Default `http://localhost:3001` |
| `COOKIE_DOMAIN` | no | Omit on localhost |
| `PAYMENT_GATEWAY` | no | Default `razorpay` |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | no | Used by the payments phase |
| `S3_BUCKET`, `S3_REGION` | no | Used by the documents phase |
| `EMAIL_PROVIDER` | no | Default `smtp` |
| `EMAIL_FROM` | worker only | Sender address (e.g. `"RentMate <your-gmail@gmail.com>"`) |
| `EMAIL_REPLY_TO` | no | Optional reply-to address |
| `SMTP_HOST` | no | Default `smtp.gmail.com` |
| `SMTP_PORT` | no | Default `465` |
| `SMTP_SECURE` | no | Default `true` (`false` for port 587 STARTTLS) |
| `SMTP_USER` | worker only | Full Gmail / SMTP username |
| `SMTP_PASSWORD` | worker only | 16-character Google App Password (without spaces) |
| `AUTH_DEV_LOG_OTP` | no | Default `false`. Logs OTP codes for local development. Startup fails when this is `true` and `NODE_ENV=production` |
| `SEED_SUPER_ADMIN_EMAIL` | for `yarn seed` | Platform admin email |
| `SEED_SUPER_ADMIN_PASSWORD` | for `yarn seed` | At least 10 characters, with a letter and a number |
| `SEED_DEMO_PASSWORD` | development seed | Shared password for demo users. Ignored unless `NODE_ENV=development` |

### Email & Gmail SMTP Configuration

Email delivery uses a Ports & Adapters abstraction (`EmailProvider` interface). Currently, the default and only active adapter is `smtp`.

**Setting up Gmail SMTP:**
1. Turn on **2-Step Verification** on your Google Account.
2. Go to Google Account Security settings and generate an **App Password**.
3. Use your full Gmail address as `SMTP_USER` and the 16-character App Password (without spaces) as `SMTP_PASSWORD`.
4. Set `EMAIL_FROM` to match your authenticated Gmail account (e.g. `"RentMate <your-gmail@gmail.com>"`), because Gmail rewrites the `From` header unless an alias ("Send mail as") is configured in Gmail settings.

*Note on Gmail limits & production:*
- Google App Passwords may not be available for certain account types (e.g., accounts with Advanced Protection or Google Workspace accounts where the administrator disabled App Passwords).
- Gmail has daily sending limits (roughly 500 emails/day for personal accounts, higher for Workspace accounts) and is intended for early development and low volume testing. Production environments should later transition to a dedicated transactional email relay (such as SendGrid, AWS SES, or Postmark) configured with proper SPF, DKIM, and DMARC DNS records on the sending domain.

**Running locally with or without the worker:**
- **Without worker (API only)**: Run only `api`, `postgres`, and `redis` with `AUTH_DEV_LOG_OTP=true`. The API process boots without requiring SMTP credentials, enqueues email jobs, and logs OTP codes directly in the API output console for easy developer login.
- **With worker (Real email delivery)**: Provide valid `SMTP_USER`, `SMTP_PASSWORD`, and `EMAIL_FROM` in `.env` and launch `yarn worker` (or `docker compose up`). The worker process fails fast on startup if required SMTP credentials are missing when `EMAIL_PROVIDER=smtp`.

Money columns added later use `NUMERIC(12,2)`. Timestamps use `timestamptz`. Primary keys are UUID v4 via `gen_random_uuid()` (`uuidExtension: pgcrypto`). The first migration enables the `pgcrypto` extension only.

## Multi-tenancy

`TenantBaseEntity` adds a non-null indexed `organization_id`. `TenantRepository` requires that id on every find, update, and delete, and always adds `organization_id = :organizationId`. A missing id throws.

`TenantContext` stores the organization id in `AsyncLocalStorage`. The JWT guard calls `TenantContext.setVerifiedIdentity()` from the verified access token. Do not read the organization id from the request body, query string, or route params. Login, OTP, and password reset look up a user by email in `AuthUserLookup` before the organization is known. That is the only user query allowed to omit `organization_id`.

## HTTP conventions

Successful responses:

```json
{
  "success": true,
  "data": {},
  "meta": { "requestId": "...", "timestamp": "...", "page": {} }
}
```

`page` is present when a handler returns `PaginatedResult`. Errors:

```json
{
  "success": false,
  "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [] },
  "meta": { "requestId": "..." }
}
```

Send `X-Request-ID` or the API generates one. The same value is returned on the response and written to logs. Pretty Pino logs are used in development. Production logs are JSON.

Rate limit: 100 requests per minute per route and client, stored in Redis. Health probes are excluded.

Auth cookies use `buildCookieOptions()`: `httpOnly`, `SameSite=Lax` in development and `SameSite=Strict` plus `Secure` in production. Set `COOKIE_DOMAIN` to a shared parent domain in production (for example `.rentmate.example`) so the API and the Next.js app can exchange cookies. Omit it on localhost.

## Authentication

There is no public signup. `yarn seed` creates the platform organization (`slug: platform`) and a super admin from `SEED_SUPER_ADMIN_EMAIL` / `SEED_SUPER_ADMIN_PASSWORD`. In development it also creates the `demo` organization and one user for each non-admin role. Demo users share `SEED_DEMO_PASSWORD`. The owner is `demo@rentmate.local`. The others are `property-manager@`, `accountant@`, `receptionist@`, `maintenance@`, `security@`, and `tenant@rentmate.local`.

Login `POST /api/v1/auth/login` with `{ "email", "password" }`. The response body matches `GET /api/v1/auth/me` and does not contain tokens. Three cookies are set:

| Cookie | Path | Contents |
| --- | --- | --- |
| `rm_access` | `/` | Access JWT (`sub`, `org`, `fid`). TTL `JWT_ACCESS_TTL`. |
| `rm_refresh` | `/api/v1/auth` | Refresh JWT (`sub`, `org`, `fid`, `jti`). Rotated on every `POST /api/v1/auth/refresh`. |
| `rm_session` | `/` | The value `1`. A presence hint for the Next.js middleware. It grants nothing. |

Reusing a revoked refresh token revokes that whole session family and returns `401 SESSION_REVOKED`. Logout revokes the current family and clears all three cookies. It still works when the access cookie has expired, as long as the refresh cookie is valid.

Passwords use Argon2id. OTP codes are 6 digits, expire in 5 minutes, and are stored hashed. Real email delivery is later; the API enqueues `notification.email`, and the worker logs the message. Set `AUTH_DEV_LOG_OTP=true` to print the code from the API process during local development.

### Endpoints

| Method | Path | Auth |
| --- | --- | --- |
| POST | `/api/v1/auth/login` | Public, 10 requests/minute |
| POST | `/api/v1/auth/refresh` | Refresh cookie |
| POST | `/api/v1/auth/logout` | Access or refresh cookie |
| POST | `/api/v1/auth/otp/send` | Public |
| POST | `/api/v1/auth/otp/verify` | Public |
| POST | `/api/v1/auth/password/forgot` | Public |
| POST | `/api/v1/auth/password/reset` | Public |
| POST | `/api/v1/auth/password/change` | Access cookie |
| GET | `/api/v1/auth/me` | Access cookie |
| GET | `/api/v1/users` | `user:read` |
| GET | `/api/v1/users/:id` | `user:read` |
| PATCH | `/api/v1/users/:id` | `user:update` |
| POST | `/api/v1/users/:id/roles` | `role:assign` and `ORG_OWNER` |
| DELETE | `/api/v1/users/:id/roles/:assignmentId` | `role:assign` and `ORG_OWNER` |
| GET | `/api/v1/roles` | Access cookie |
| GET | `/api/v1/permissions` | Access cookie |

A user in another organization is returned as `404`, not `403`. Property-scoped role assignment returns `422 NOT_SUPPORTED_YET`.

### Error codes

`VALIDATION_ERROR`, `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `TENANT_SCOPE_MISSING`, `INTERNAL_ERROR`, `INVALID_CREDENTIALS`, `ACCOUNT_LOCKED`, `ACCOUNT_SUSPENDED`, `SESSION_REVOKED`, `TOKEN_EXPIRED`, `OTP_INVALID`, `OTP_EXPIRED`, `OTP_LOCKED`, `LAST_OWNER`, `NOT_SUPPORTED_YET`, `WEAK_PASSWORD`.

### Seeded roles

`SUPER_ADMIN` has only `platform:*` and no access to organization data. `ORG_OWNER` has every organization permission, including `role:assign`. `PROPERTY_MANAGER` operates properties, units, tenants, leases, complaints, and visitors. `ACCOUNTANT` has invoice, payment, expense, and report permissions and cannot manage tenants. `RECEPTIONIST` handles visitors and can read tenants. `MAINTENANCE_STAFF` has complaint permissions only. `SECURITY_STAFF` has visitor permissions only. `TENANT` can read their lease and invoices and create complaints and visitors.

## Working with the client repo

The frontend runs separately, by default at `http://localhost:3001`.

- API base URL: `http://localhost:3000/api/v1`
- OpenAPI UI: `http://localhost:3000/api/docs`
- OpenAPI document: `http://localhost:3000/api/docs-json`

Generate client types from `GET /api/docs-json`. CORS allows the origins in `CORS_ORIGIN`, allows credentials, and exposes `X-Request-ID`. Health checks are outside the versioned prefix:

- `GET /health/live` — process is up
- `GET /health/ready` — Postgres and Redis are reachable

Those two routes are not wrapped in the response envelope.

## Queues

The worker registers these BullMQ queues: `notification.email`, `notification.sms`, `notification.whatsapp`, `notification.fcm`, `invoice.generate`, `invoice.overdue`, `lease.expiry-check`, `report.generate`, `document.process`, `webhook.process`.

Default job options are 5 attempts, exponential backoff, and caps on retained completed and failed jobs. Add a processor by extending `BaseProcessor` and decorating it with `@Processor(QueueName.X)`.
