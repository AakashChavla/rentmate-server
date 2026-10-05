# organizations

Phase 2 stores organizations and exposes OrganizationDirectory through an abstract repository. Registration creates an inactive organization transactionally; email verification activates it. Repository locking serializes last-owner changes, and guarded cleanup removes expired unverified organizations.

See [Phase 2 report](../../../docs/ai/17-phase2-report.md) for data constraints and isolation/retention tests.
