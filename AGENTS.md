# RentMate engineering instructions

Execute M0-M9 in order. Read the roadmap before changes. Never declare pending work complete.
Use the pasted rebuild request as the binding scope. Follow the linked guides.
Keep platform code below modules. Route cross-module calls through public contracts.
Use Controller -> Service -> Repository -> database. Never import TypeORM in services.
Use verified JWT organization identity, scoped targeted writes and ambient transactions.
Keep secrets out of Git and logs. Use masked structured Pino logging.
Use strict TypeScript and the documented file/function limits. Reuse existing helpers.
On the client, keep pages thin, schemas in features and fetch in API modules only.
Test behavior, tenancy, races, permissions and accessibility. Never mock TypeORM internals.
Commit green milestones only on rebuild/from-scratch. Never push, amend or rewrite history.
Run yarn rules:check now; add and run stack checks in the corresponding scaffold milestone.
Definition of done: required checks observed passing, docs updated and gaps explicitly recorded.

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

## Git discipline
Work on rebuild/from-scratch. Commit green milestones using Conventional Commits. Never push, amend or rewrite history. Stop after each phase for user continuation.

## Commands
Use Node from .nvmrc and Corepack Yarn 1.22.22. Run yarn install, yarn dev, yarn build, yarn check, yarn test:integration and yarn docker. Migrations become available with Prisma in Phase 2.

## Tech stack
NestJS, TypeScript, PostgreSQL, Prisma, Redis and BullMQ. Biome, Vitest and Husky enforce checks.

## Architecture and lifecycle
src/core contains platform abstractions and cannot import domains. Controller -> application service -> domain repository port -> infrastructure adapter -> database. Only infrastructure imports Prisma. Cross-context calls use public contracts.

## Folder conventions
Follow the binding rebuild layout and ADR-0001. Register helpers in docs/ai/11-reusable-catalog.md before reuse.

## Critical rules
Strict TypeScript; no any; validate all boundary input; no secrets or unmasked PII in logs; verified JWT organization scope on all tenant operations. Limit files to 300 lines and functions to 50 lines.

## Testing
Use *.spec.ts for units and *.int.spec.ts for integrations. Unit tests use in-memory ports; integrations use real infrastructure. Independent factories and no shared state. Test tenancy, races, permissions and accessibility.

## Definition of Done
Observed passing install, lint, typecheck, tests and build; applicable real infrastructure checks; docs updated; gaps recorded; green milestone commit. Never declare pending work complete.

## Never do
Never disable lint, skip required tests, commit secrets, edit generated files manually, modify applied migrations, import infrastructure into business logic or proceed to the next phase without user continuation.
