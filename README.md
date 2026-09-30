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
| `yarn test` | Jest |
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
| `SENDGRID_API_KEY` | no | Used by the notifications phase |

Money columns added later use `NUMERIC(12,2)`. Timestamps use `timestamptz`. Primary keys are UUID v4 via `gen_random_uuid()` (`uuidExtension: pgcrypto`). The first migration enables the `pgcrypto` extension only.

## Multi-tenancy

`TenantBaseEntity` adds a non-null indexed `organization_id`. `TenantRepository` requires that id on every find, update, and delete, and always adds `organization_id = :organizationId`. A missing id throws.

`TenantContext` stores the organization id in `AsyncLocalStorage`. The auth phase will set it from the verified JWT through `TenantContext.setVerifiedIdentity()`. Do not read the organization id from the request body, query string, or route params.

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

Auth cookies, when added, should use `buildCookieOptions()`: `httpOnly`, `SameSite=Strict` and `Secure` in production, and `COOKIE_DOMAIN` when it is set.

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
