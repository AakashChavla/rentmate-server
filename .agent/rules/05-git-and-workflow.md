# Rule: Git Discipline and Workflow

Enforce strict workflow discipline and verification commands before declaring completion.

## Core Directives
- **Git Restrictions**: NEVER run `git commit`, `git add`, `git push`, or `git commit --amend` unless the user explicitly requests it in the current prompt message.
- **Verification Commands**: Before finishing any task, run `yarn rules:check`, `yarn lint`, `yarn test`, and `yarn build`. Run `yarn test:e2e` when touching auth, tenancy, or repositories.
- **Planning**: Formulate a clear step-by-step plan before writing code for changes touching more than 3 files.

Detailed guide: [08-git-and-workflow.md](docs/ai/08-git-and-workflow.md)
