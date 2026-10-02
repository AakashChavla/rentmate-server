# Rule: Code Style and Naming Conventions

Maintain high TypeScript quality, strict type safety, and clean naming.

## Core Directives
- **Strict TypeScript**: `any` is forbidden; use `unknown` or Zod schemas. Explicit return types required on public methods and exported functions.
- **Exports**: No default exports. No barrel re-export-all (`export *`). Single exported class per file.
- **File Suffixes**: Use kebab-case with role suffixes (`.module.ts`, `.controller.ts`, `.service.ts`, `.repository.ts`, `.dto.ts`, `.spec.ts`, `.int-spec.ts`).
- **File & Fn Limits**: Max ~300 lines per file, ~50 lines per function. Cyclomatic complexity <= 10.
- **Reusability**: Search `shared/`, `core/`, and [11-reusable-catalog.md](docs/ai/11-reusable-catalog.md) before writing helper functions. Extract 3rd duplicates.

Detailed guide: [02-code-style-and-naming.md](docs/ai/02-code-style-and-naming.md) and [11-reusable-catalog.md](docs/ai/11-reusable-catalog.md)
