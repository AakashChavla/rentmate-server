---
name: new-bounded-context
description: Create a bounded context following RentMate conventions.
---
Read AGENTS.md and docs/ai/11-reusable-catalog.md first.
Use yarn generate context. A new context requires an ADR. Keep api, application, domain and infrastructure separate; expose public contracts for cross-context calls.
Ship behavioral tests and update the reusable catalog before committing.
