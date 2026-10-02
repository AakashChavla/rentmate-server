# Workflow: Create New Business Module

1. Run code generator:
   ```bash
   yarn gen module <name>
   ```
2. Follow architectural rules in `AGENTS.md` and `docs/ai/01-architecture.md`.
3. Implement `contracts/`, `controllers/`, `services/`, `repositories/`, `entities/`, `tests/`.
4. Run validation: `yarn lint`, `yarn arch:check`, `yarn test`, `yarn build`.
