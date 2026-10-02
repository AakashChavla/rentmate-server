# 08. Git Discipline, Workflow & Step-by-Step Recipes

This document outlines strict version control rules, AI developer workflow boundaries, verification steps, definition of done, and common task recipes.

---

## 1. Strict Git Directive for AI Assistants

> **CRITICAL DIRECTIVE**: NEVER execute `git commit`, `git add`, `git push`, `git checkout -b`, or `git commit --amend` unless the user explicitly requests it in the current prompt message. Finishing an engineering task is NOT permission to commit code.

### Conventional Commits (When Explicitly Instructed)
When the user explicitly asks to commit changes, use conventional commit format:
- `feat(auth): add email OTP verification endpoint`
- `fix(tenancy): add missing organization_id index on units`
- `docs(ai): update engineering rules catalog`
- `test(leases): add IDOR E2E test for lease retrieval`
- `refactor(database): extract TransactionRunner helper`

---

## 2. Antigravity Configuration Note

> **Note on Antigravity Rule Folder**: The repository includes workspace rules in `.agent/rules/*.md`. If your installed version of Google Antigravity looks for workspace rules in `.agents/rules/` (plural `agents`), rename the `.agent` folder to `.agents`.

---

## 3. Plan Before Code Policy

For any non-trivial engineering task touching more than 3 files:
1. Outline a detailed, step-by-step plan.
2. Present the plan to the user.
3. Wait for approval or feedback before mutating code files.

---

## 4. Verification Commands & Definition of Done

Before declaring any engineering task completed, execute:
```bash
yarn rules:check   # Validate engineering rulebook integrity and size limits
yarn lint          # ESLint syntax & style checks
yarn test          # Jest unit and integration tests
yarn build         # TypeScript compilation check
```
Run `yarn test:e2e` whenever touching authentication, multi-tenancy, or repository access layers.

---

## 5. Step-by-Step Recipe: Adding a Queue Processor

1. Declare new queue name in queue constants (e.g., `QueueName.DOCUMENT_PROCESS`).
2. Register queue in BullMQ configuration.
3. Create processor class in target module or `core/queue/`: `processors/<name>.processor.ts`.
4. Extend `BaseProcessor`:
   ```ts
   @Processor(QueueName.DOCUMENT_PROCESS)
   export class DocumentProcessor extends BaseProcessor {
     async processJob(job: Job<DocumentJobData>): Promise<void> {
       // Process queue job
     }
   }
   ```
5. Register processor in module `providers`.
6. Add unit test verifying job processing and error handling (checking `retryable` flag).

---

## 6. Do & Don't Block

```ts
// DO: Perform local verification before completing task
// Run: yarn rules:check && yarn lint && yarn test && yarn build

// DON'T: Auto-commit code changes without user request
// Executing `git commit -m "..."` without user prompt request -> STRICT VIOLATION!
```
