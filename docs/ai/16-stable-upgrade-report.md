# Stable dependency baseline - 2026-10-05

The latest user request supersedes the old Phase 0/1 version pins. Both repositories use local chore/stable-upgrade branches. Architecture, tenant isolation, localization, motion and security gates remain binding. No next-phase business work was started.

## Runtime and tooling

- Node 26.10.0 is the latest non-prerelease Current release verified from [the official index](https://nodejs.org/dist/index.json). It is not LTS; the latest LTS was 24.21.0 at discovery. A portable Windows binary was SHA256-verified; .nvmrc, engines, Docker and CI use the new baseline.
- [PostgreSQL 18.6](https://www.postgresql.org/docs/release/) is the latest stable release; PostgreSQL 19 is beta and excluded. Compose uses a new postgres18-data volume at /var/lib/postgresql, preserving the old PostgreSQL 16 volume. Existing application data has not been migrated between majors.
- [Redis 8.10.2](https://github.com/redis/redis/releases/tag/8.10.2) is non-prerelease. Nginx is pinned to [stable 1.30.5](https://nginx.org/en/download.html).
- Yarn 4.18.1 and Corepack 0.36.0 replace Yarn Classic. Node 26 does not bundle Corepack: install it explicitly. Use yarn install --immutable, the node-modules linker and project-local caches; no native integrity checks are disabled.
- TypeScript 7.0.2 is the registry latest, but latest TypeScript ESLint requires <6.1, Nest Swagger accepts only 5/6, and ts-jest requires <7. Server uses the newest supported 6.0.3. Latest OpenAPI TypeScript additionally requires ^5.9, so client uses the newest compatible 5.9.3. These are explicit compatibility exceptions, not silent latest claims.

## Compatibility work

Nest 12 and TypeORM 1 use ESM. The production CommonJS output runs with Node 26 native ESM interop. Jest 30 uses a current SWC JavaScript transform and ts-jest for TypeScript, avoiding mixed-loader dependency cycles. Explicit Jest/Node types are configured. Windows tests need the existing private SWC_NATIVE_BINDING_CACHE.

The key-value adapter now uses the current official node-redis client, avoiding TypeORM's optional ioredis peer conflict while preserving the abstract port and atomic Lua counter. BullMQ remains behind its publishers/worker port.

Next 16 request headers/cookies are awaited; middleware was migrated to proxy.ts. React 19 and Tailwind 4 use the automatic JSX runtime, @tailwindcss/postcss, CSS imports and the existing theme config. MSW 3 uses onUnhandledFrame; the credentials test inspects the actual fetch options because normalized mock requests report same-origin. Browser observer fakes implement scrollMargin. Gate proofs use dependency-cruiser 18's renamed executable.

## Verification

Both yarn verify commands passed: server 18 unit + 6 HTTP e2e + 3 real PostgreSQL 18/Redis 8 integration tests; client 13 tests and the Next 16 production build. Server compilation, OpenAPI export and generated client API types passed. The compiled Node 26 API returns 200 at /health/ready with both stores ready. Migration proof enabled pgcrypto and recorded one migration in the isolated fixture database.

Client gate proof: 31 temporary violations rejected. Both production Docker images built successfully. The server runs as UID 1000 and returns healthy readiness against the isolated PostgreSQL 18/Redis 8 fixture. Server gate proof: 42 temporary violations rejected; client gate proof: 31 rejected. Both fixture suites restore and remove their temporary files. The client production container runs as UID 1000 and serves both locales with correct HTML language and nonce CSP. Windows mapped-file write failures in proof restoration were resolved by atomic fixture writes; CLAUDE.md and catalogs were restored. The initial migration command was automatically rejected because its connection target was unspecified; the successful rerun explicitly targeted the isolated fixture at loopback port 25432.

Yarn audits now report one high braces advisory in each repository; server additionally reports a moderate deprecated glob 10 dependency. There are no critical findings in these audits, including no remaining Next 14 critical advisory. Counts are unique Yarn report entries, not the previous Yarn Classic dependency-path counts. Audits remain failing and release remains blocked. No advisory was suppressed. Remote CI, Gitleaks and CodeQL and browser visual/contrast QA remain unverified.

Logs and release metadata are in workspace .rentmate-tools/upgrade-*. Node 26, PostgreSQL 18.6 and Redis 8.10.2 were actually executed, not just relabeled. The separate rentmate-stable-check project uses fixture ports 25432/26379 and preserves existing volumes. Nothing was pushed, amended or rewritten.

## Exact dependency pins

| Package                  | Installed stable version | Registry latest at discovery |
| ------------------------ | ------------------------ | ---------------------------- |
| @eslint/js               | 10.0.1                   | 10.0.1                       |
| @jest/globals            | 30.5.2                   | 30.5.2                       |
| @nestjs/common           | 12.1.2                   | 12.1.2                       |
| @nestjs/core             | 12.1.2                   | 12.1.2                       |
| @nestjs/event-emitter    | 12.0.1                   | 12.0.1                       |
| @nestjs/platform-express | 12.1.2                   | 12.1.2                       |
| @nestjs/swagger          | 12.0.2                   | 12.0.2                       |
| @nestjs/testing          | 12.1.2                   | 12.1.2                       |
| @swc/core                | 1.16.13                  | 1.16.13                      |
| @swc/jest                | 0.2.39                   | 0.2.39                       |
| @types/compression       | 1.8.1                    | 1.8.1                        |
| @types/cookie-parser     | 1.4.10                   | 1.4.10                       |
| @types/express           | 5.0.6                    | 5.0.6                        |
| @types/jest              | 30.0.0                   | 30.0.0                       |
| @types/node              | 26.6.4                   | 26.6.4                       |
| @types/pg                | 8.23.1                   | 8.23.1                       |
| @types/supertest         | 7.2.1                    | 7.2.1                        |
| bullmq                   | 6.3.11                   | 6.3.11                       |
| class-transformer        | 0.5.1                    | 0.5.1                        |
| class-validator          | 0.15.1                   | 0.15.1                       |
| compression              | 1.8.2                    | 1.8.2                        |
| cookie-parser            | 1.4.7                    | 1.4.7                        |
| dependency-cruiser       | 18.5.0                   | 18.5.0                       |
| eslint                   | 10.12.0                  | 10.12.0                      |
| helmet                   | 8.3.0                    | 8.3.0                        |
| husky                    | 9.1.7                    | 9.1.7                        |
| jest                     | 30.5.2                   | 30.5.2                       |
| lint-staged              | 17.6.0                   | 17.6.0                       |
| nestjs-i18n              | 10.8.5                   | 10.8.5                       |
| nestjs-pino              | 5.3.1                    | 5.3.1                        |
| pg                       | 8.23.1                   | 8.23.1                       |
| pino                     | 10.4.0                   | 10.4.0                       |
| pino-http                | 11.0.0                   | 11.0.0                       |
| plop                     | 4.0.5                    | 4.0.5                        |
| prettier                 | 3.9.9                    | 3.9.9                        |
| redis                    | 6.3.0                    | 6.3.0                        |
| reflect-metadata         | 0.2.2                    | 0.2.2                        |
| rxjs                     | 7.8.2                    | 7.8.2                        |
| supertest                | 7.3.1                    | 7.3.1                        |
| ts-jest                  | 29.4.14                  | 29.4.14                      |
| tsx                      | 4.23.15                  | 4.23.15                      |
| typeorm                  | 1.1.1                    | 1.1.1                        |
| typescript               | 6.0.3                    | 7.0.2                        |
| typescript-eslint        | 8.71.0                   | 8.71.0                       |
| zod                      | 4.6.5                    | 4.6.5                        |
