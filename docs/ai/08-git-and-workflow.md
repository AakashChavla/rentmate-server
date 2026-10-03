# Git and workflow

Legacy tag: legacy/pre-rebuild-2026-10-03. Work on phase/0-charter for this phase, then phase/<n>-<slug> from the previous phase. Keep Conventional Commits, one per logical step; never push, amend, rewrite history or change remotes.
Do not repeat the completed legacy reset. Existing interrupted scaffolds were snapshotted before replacement. Do not commit local secrets or runtime/dependency backups.
Keep AGENTS.md <=10000 characters. Keep CLAUDE.md (first line @AGENTS.md), GEMINI.md, .agent/.cursor and GitHub instructions short and resolving to docs/ai. Husky runs rules:check and lint-staged.
