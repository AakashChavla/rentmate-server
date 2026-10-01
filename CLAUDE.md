# CLAUDE.md

Read and follow `AGENTS.md` (repo root) — it is the single source of truth for rules, layering, naming, testing and workflow. Also read `docs/architecture.md` before non-trivial changes.

Claude Code specifics:
- Never `git commit/add/push` unless the current message explicitly asks.
- Plan first for anything touching more than 3 files; list files before editing.
- Prefer small, reviewable diffs. One module per commit when refactoring.
- Run `yarn lint && yarn test && yarn test:e2e && yarn build` before reporting done.
- Use `/review` and `/security-review` on the diff before handing back.
- If a rule in `AGENTS.md` blocks the task, stop and ask; do not work around it.
