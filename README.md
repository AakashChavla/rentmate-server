# RentMate API

The API implements authentication, registration, scoped RBAC, organization settings, property CRUD/configuration and the encrypted invitation lifecycle on the NestJS/PostgreSQL/Redis platform.

Use Node 26.10.0 and Corepack Yarn 4.18.1. Read [AGENTS.md](AGENTS.md), [status](docs/ai/10-roadmap-and-status.md) and [Phase 3 report](docs/ai/18-phase3-report.md).

Copy .env.example to an ignored .env and supply your own database credential and three independent authentication secrets. Compose loads interpolation values from .env. Local development, worker, migration and seed scripts load .env followed by optional .env.local; existing shell variables take precedence. Neither file is committed or copied into Docker images.

```powershell
npm install --global corepack@0.36.0
corepack enable
yarn install --immutable
docker compose up -d --build
yarn verify
yarn rules:proof
yarn openapi:export
```

The proxy exposes loopback port 3000. /health/live and /health/ready are unwrapped; readiness checks PostgreSQL and Redis. /api/docs and /api/docs-json are development defaults and disabled by default in production. Override DB_EXPOSED_PORT, REDIS_EXPOSED_PORT and API_EXPOSED_PORT when local ports are unavailable. CORS_ORIGIN accepts a comma-separated origin list; TRUST_PROXY is an explicit hop count.

Migrations run once before API and worker startup. For a scaling check use docker compose up -d --scale api=3: the internal API replicas share PostgreSQL/Redis and Nginx resolves the service dynamically. The worker handles encrypted localized identity/invitation emails and registration cleanup. Later domain processors reuse WorkerHost.

Direct development: yarn migration:run, yarn start:dev (or yarn dev) and yarn worker:dev. Use .env.local for host connection overrides: DB_HOST=127.0.0.1, DB_PORT matching DB_EXPOSED_PORT (default 5432), REDIS_URL=redis://127.0.0.1:6379 and SMTP_HOST=127.0.0.1. Set PORT=3002 while Docker's proxy occupies 3000; local docs are then http://localhost:3002/api/docs. To connect the client to this local API, set NEXT_PUBLIC_API_URL=http://localhost:3002 in the client's ignored .env.local and restart yarn dev. yarn build/yarn start run compiled API code; compiled execution needs exported variables or Node --env-file. Dockerfile prod is non-root and copies dist into the runtime image. Shutdown closes workers, publishers, Redis and database connections.

Export OpenAPI before client yarn api:types. Plop module/integration/processor generators and all strict gates remain available. Integration tests require a dedicated fixture database and create/drop only their own sample tables. Current audits block release; see the report for verified results and external limitations.

Current dependency policy and compiler exceptions: [stable upgrade report](docs/ai/16-stable-upgrade-report.md). Refresh non-prerelease registry versions and rerun verification before each new phase. Keep older PostgreSQL volumes intact; a major upgrade needs a separate data migration.
