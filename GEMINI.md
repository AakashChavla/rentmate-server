# GEMINI.md (Google Antigravity)

Follow `AGENTS.md` at the repo root as the single source of truth (layering, folders, naming, tests, security). Read `docs/architecture.md` first.

Antigravity specifics:
- Produce a short plan artifact (files to add/change) before editing; wait for approval on anything touching more than 3 files.
- Do not run git write commands unless asked.
- Run `yarn lint && yarn test && yarn test:e2e && yarn build` and report results before finishing.
- If the task conflicts with `AGENTS.md`, stop and ask.
