---
name: new-repository
description: Create a repository following RentMate conventions.
---
Read AGENTS.md and docs/ai/11-reusable-catalog.md first.
Place abstract repository ports in domain and Prisma adapters in infrastructure. Scope reads and targeted writes by verified organization identity; use ambient transactions. Test isolation against real PostgreSQL.
Ship behavioral tests and update the reusable catalog before committing.
