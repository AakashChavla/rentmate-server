# Roadmap and status

## Milestones
- M0: reset, legacy preservation and rule/documentation foundation; verification recorded below.
- M1-M5: pending server scaffold, data model, authentication, authorization, verification.
- M6-M8: pending client scaffold, authentication, users/profile and verification.
- M9: pending cross-repository manual verification.

## Decisions made
- Keep the attached architecture reference at ../docs/architecture.html; the pasted request takes precedence.
- Preserve local environment files before the snapshot so real secrets cannot enter commits. This reorders M0 steps 1 and 4 to satisfy the stronger secrets requirement.
- Use dependency-free rule checking during M0; add TypeScript tooling and Husky in the stack scaffold milestones.
- Use Yarn 1.22.22 through Corepack with Node 20.x as the declared baseline. The available host Node is 22.14.0; Node 20 validation remains pending.
- Placeholder documentation captures binding rules now and will be expanded alongside implemented milestones.

## Known gaps and unverified work
- No application code, dependencies, Docker images, migrations, seeds, API schema or client types exist at M0.
- All M1-M9 checks and manual workflows remain pending. Do not claim the product is runnable.
- Application lint, typecheck, unit/integration/e2e tests, architecture proofs and builds are not applicable to this documentation-only milestone.

## Phase 3 prerequisites
- Decide which property types the MVP supports and the unit/bed/occupancy model.
- Confirm organization onboarding operations, property ownership, tax/invoice requirements and tenant onboarding/KYC policy.
- Verify M1-M9 and cookie/domain configuration before starting Phase 3.

## Verification
Pending execution of rules:check and its negative fixtures.
