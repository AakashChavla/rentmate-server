# organizations

Phase 2 stores organizations and exposes OrganizationDirectory through an abstract repository. Registration creates an inactive organization transactionally; email verification activates it. Repository locking serializes last-owner changes, and guarded cleanup removes expired unverified organizations.

See [Phase 2 report](../../../docs/ai/17-phase2-report.md) for data constraints and isolation/retention tests.

Phase 3 adds organization settings and scoped invitations behind abstract service/repository/policy ports. L0 validates property existence through OrganizationPropertyDirectory. Invite acceptance is single use, throttled and transactional; localized emails are encrypted in the queue. See [Phase 3 report](../../../docs/ai/18-phase3-report.md).
