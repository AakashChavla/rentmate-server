---
name: new-module
description: Generate a new canonical business module for rentmate-server
---

# New Module Workflow
To generate a new business module following the canonical structure defined in `AGENTS.md` and `docs/ai/`:

1. Run code generator:
   ```bash
   yarn gen module <name>
   ```
2. Implement contract interfaces in `src/modules/<name>/contracts/`.
3. Add repository queries extending `TenantScopedRepository` or `GlobalRepository`.
4. Register contracts in `index.ts` and module providers.
5. Refer to `docs/ai/01-architecture.md` and `docs/ai/03-data-access-and-tenancy.md`.
