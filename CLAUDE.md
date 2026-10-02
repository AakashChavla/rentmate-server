@AGENTS.md

# Claude Code Specific Notes

When working on `rentmate-server`, follow all non-negotiable rules defined in `AGENTS.md` and the detailed guides in `docs/ai/`.

## Claude Habits & Workflow
- **Plan Before Code**: For any non-trivial task or task touching more than 3 files, always formulate a clear step-by-step implementation plan before modifying files.
- **Subagents**: Use subagents for independent research, isolated validation, or multi-step analysis tasks when appropriate.
- **Git Discipline**: Never run `git commit`, `git add`, `git push`, or `git commit --amend` unless explicitly requested in the current message.
- **Verification**: Always run `yarn rules:check`, `yarn lint`, `yarn test`, and `yarn build` before considering a task completed.

## Key Rules & Documentation Map
- Architecture & Module Layers: [01-architecture.md](docs/ai/01-architecture.md)
- Code Style & Naming: [02-code-style-and-naming.md](docs/ai/02-code-style-and-naming.md)
- Data Access & Tenancy: [03-data-access-and-tenancy.md](docs/ai/03-data-access-and-tenancy.md)
- Integrations (Ports/Adapters): [04-integrations.md](docs/ai/04-integrations.md)
- API Conventions: [05-api-conventions.md](docs/ai/05-api-conventions.md)
- Testing Strategy: [06-testing.md](docs/ai/06-testing.md)
- Security & Logging: [07-security-and-logging.md](docs/ai/07-security-and-logging.md)
- Git & Workflow: [08-git-and-workflow.md](docs/ai/08-git-and-workflow.md)
- Review Checklist: [09-review-checklist.md](docs/ai/09-review-checklist.md)
- Roadmap & Deviations: [10-roadmap-and-status.md](docs/ai/10-roadmap-and-status.md)
- Reusable Catalog: [11-reusable-catalog.md](docs/ai/11-reusable-catalog.md)
