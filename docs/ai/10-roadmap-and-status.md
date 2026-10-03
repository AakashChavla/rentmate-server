# Roadmap and status

## Phase 0

Implemented: engineering charter, pointer checks, ESLint 9, architecture/localization gates, generators, hooks, CI and minimal bilingual applications. Both repositories passed yarn verify:quick on 2026-10-03. See [verification report](14-phase0-report.md).

## Decisions made

- The latest Phase 0 request supersedes the earlier M0-M9 scope and intervening Prisma/Biome/Next 15 scaffold. Existing work was preserved in snapshot commits; this phase uses NestJS, ESLint 9 and Next.js 14.
- Preserve the existing legacy tags/reset history; use phase/0-charter without repeating the destructive reset.
- Pin Node 20.20.2 and Yarn 1.22.22. The workspace portable Node binary was checked against the official SHA256.
- Preserve local environment/npm files without reading their contents in ../.rentmate-legacy-env. Preserve old dependency caches outside the repositories.
- No Postgres/Redis, authentication, tenant repositories or business features are implemented in Phase 0. Server test:int/test:e2e explicitly fail until real infrastructure suites exist.
- Keep /health/live outside the future business response envelope for health probes; its exact shape is exported in OpenAPI and generated client types.
- Resolve English/Hindi preferences without locale URL prefixes. NEXT_LOCALE stores only a non-sensitive preference; user/org sources arrive with authentication.
- Pin nestjs-i18n 10.5.0 and jest-dom 6.9.1 for Node 20 compatibility. Patch available cookie, YAML, PostCSS and Vitest advisories; keep audit failures visible.
- Keep the explicitly requested Next.js 14.2.35. Current critical advisories require Next >=15.5.24, so release is blocked pending a supported-framework decision. Do not waive audits.
- Windows SWC requires a private native cache under the user profile; use SWC_NATIVE_BINDING_CACHE. Only that new directory received a protected ACL. No integrity checks were disabled.
- Use a 60-second Jest test budget for real Nest startup on Windows; the previous 5-second budget timed out under concurrent builds.
- Client development/start scripts bind loopback on port 3001. Smoke testing used 3002 because another process occupied 3001.

## Known gaps

Dependency audits fail: server 11 high findings (one unpatched braces advisory across tooling paths); client 2 low, 11 moderate, 11 high and 2 critical findings (Next and braces). Counts are dependency paths, not unique advisories.
Docker daemon was unavailable; Postgres/Redis, scaling and DB-dependent tests were not verified. Remote CI, CodeQL and Gitleaks were configured but not executed. Hindi needs human review before production use.
The Next standalone output needs its generated server entrypoint and copied public/static assets for packaged deployment; yarn start is the local smoke command.

## Next phases

Implement platform/database/tenancy foundations before domain features. Resolve supported property types, occupancy/unit/bed semantics, billing dates/proration/GST, KYC policy, lease membership and organization onboarding before domain schema design.
