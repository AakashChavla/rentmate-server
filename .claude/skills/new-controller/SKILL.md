---
name: new-controller
description: Create a controller following RentMate conventions.
---
Read AGENTS.md and docs/ai/11-reusable-catalog.md first.
Place controllers and boundary DTOs in domains/<context>/api. Depend on application services. Deny routes by default; validate input and test permissions.
Ship behavioral tests and update the reusable catalog before committing.
