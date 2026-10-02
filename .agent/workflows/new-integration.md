# Workflow: Create New Integration

1. Run code generator:
   ```bash
   yarn gen integration <capability> <vendor>
   ```
2. Define provider port abstract class in `src/integrations/<capability>/`.
3. Implement vendor adapter in `src/integrations/<capability>/adapters/`.
4. Follow rules in `docs/ai/04-integrations.md`.
5. Run validation: `yarn lint`, `yarn arch:check`, `yarn test`, `yarn build`.
