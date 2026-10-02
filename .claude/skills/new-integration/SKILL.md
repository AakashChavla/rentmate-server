---
name: new-integration
description: Create a new external integration using Ports & Adapters
---

# New Integration Workflow
To create a new integration capability:

1. Run code generator:
   ```bash
   yarn gen integration <capability> <vendor>
   ```
2. Define provider port abstract class in `src/integrations/<capability>/`.
3. Implement vendor adapter in `src/integrations/<capability>/adapters/<vendor>-<capability>.provider.ts`.
4. Implement shared contract test in `src/integrations/<capability>/tests/contracts/`.
5. Refer to `docs/ai/04-integrations.md`.
