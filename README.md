# RentMate API

Phase 1 supplies the NestJS platform: PostgreSQL/TypeORM migrations, Redis, BullMQ ports, tenant-scoped repository primitives, localized envelopes, Pino, security middleware, health probes and a separate worker. Business modules are explicit placeholders; authentication arrives in Phase 2.

Use Node 20.20.2 and Corepack Yarn 1.22.22. Read [AGENTS.md](AGENTS.md), [status](docs/ai/10-roadmap-and-status.md) and [Phase 1 report](docs/ai/15-phase1-report.md).

Copy .env.example to an ignored .env and supply your own database credential. Compose loads interpolation values from .env; direct Node execution needs exported environment variables or Node --env-file. Never commit .env.

```powershell
corepack enable
yarn install --frozen-lockfile
docker compose up -d --build
yarn verify
yarn rules:proof
yarn openapi:export
```

The proxy exposes loopback port 3000. /health/live and /health/ready are unwrapped; readiness checks PostgreSQL and Redis. /api/docs and /api/docs-json are development defaults and disabled by default in production. Override DB_EXPOSED_PORT, REDIS_EXPOSED_PORT and API_EXPOSED_PORT when local ports are unavailable. CORS_ORIGIN accepts a comma-separated origin list; TRUST_PROXY is an explicit hop count.

Migrations run once before API and worker startup. For a scaling check use docker compose up -d --scale api=3: the internal API replicas share PostgreSQL/Redis and Nginx resolves the service dynamically. No business queue handlers are registered yet. WorkerHost is ready to register them in later slices.

Direct development: yarn migration:run, yarn dev and yarn worker:dev with validated environment variables. yarn build/yarn start run compiled API code; Dockerfile prod is non-root and copies dist into the runtime image. Shutdown closes workers, publishers, Redis and database connections.

Export OpenAPI before client yarn api:types. Plop module/integration/processor generators and all strict gates remain available. Integration tests require a dedicated fixture database and create/drop only their own sample tables. Current audits block release; see the report for verified results and external limitations.
