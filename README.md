# RentMate API

Phase 0 provides a minimal NestJS API with validated configuration, Pino, abstract Clock/HealthService ports and localized GET /health/live. Business features and authentication are future phases.

Use Node 20.20.2 and Corepack Yarn 1.22.22. Read [AGENTS.md](AGENTS.md) and [status](docs/ai/10-roadmap-and-status.md).

```powershell
corepack enable
yarn install --frozen-lockfile
yarn dev
```

The API defaults to port 3000. Optional environment values are listed in .env.example; configuration is validated at startup. Test English/Hindi with Accept-Language or NEXT_LOCALE on /health/live.

```text
yarn verify:quick
yarn rules:proof
yarn i18n:types
yarn openapi:export
yarn gen module
yarn gen integration
yarn gen processor
yarn build
yarn start
```

Always export the server OpenAPI before generating client types. Generated contracts currently contain only the health endpoint. Full yarn verify also invokes infrastructure gates which intentionally fail until Postgres/Redis integration and e2e suites exist.

Quick verification passed locally. Dependency audits remain failing; Next.js 14 has critical advisories requiring a newer major version, and braces has an unpatched tooling advisory. Release is blocked. Remote CI/security scanners and Docker/Postgres/Redis were not verified. See [the full report](docs/ai/14-phase0-report.md).
