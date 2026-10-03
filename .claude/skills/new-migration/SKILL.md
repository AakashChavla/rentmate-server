---
name: new-migration
description: Create a migration following RentMate conventions.
---
Read AGENTS.md and docs/ai/11-reusable-catalog.md first.
After Phase 2 introduces Prisma, use yarn migrate to create a backward compatible migration. Never edit an applied migration. Verify composite organization foreign keys and indexes against real PostgreSQL.
Ship behavioral tests and update the reusable catalog before committing.
