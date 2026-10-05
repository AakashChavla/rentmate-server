# ADR 0003: Current stable dependency baseline

Accepted 2026-10-05. The user requested current stable runtimes and packages before proceeding to another phase. This supersedes version pins in ADR 0001/0002 without changing their architectural decisions.

Use verified non-prerelease releases and exact dependency pins. Node 26.10.0 is Current, not LTS. PostgreSQL 18.6, Redis 8.10.2, Yarn 4.18.1 and Corepack 0.36.0 align local tooling, Docker and CI. Refresh versions and validate compatibility before each subsequent phase.

Compiler compatibility takes precedence over an unsupported latest compiler: server TypeScript 6.0.3 and client 5.9.3 satisfy current tooling peers; TypeScript 7.0.2 does not. Nest 12/TypeORM 1 ESM interoperability uses Node 26 in production and SWC transforms in Jest. Next 16 uses proxy.ts and async request APIs; Tailwind 4 retains the established theme through its supported config adapter.

PostgreSQL 18 uses a new volume and its new image data layout. Preserve earlier volumes and migrate existing data separately. Keep security audit failures visible; current transitive braces findings block release. See docs/ai/16-stable-upgrade-report.md for versions, evidence and limitations.
