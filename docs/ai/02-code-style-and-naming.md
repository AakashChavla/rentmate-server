# Code style and naming

Use strict TypeScript, no any, no console calls, no floating promises and explicit return types for exported functions. Limit files to 300 lines, functions to 50 lines and complexity to 10. Prettier uses single quotes, two spaces and 100 columns.
Backend filenames are kebab-case with role suffixes; classes use PascalCase and role suffixes. Ports have domain names; implementations use Default/System/TypeOrm/Redis/vendor prefixes. No I prefix. Client components use PascalCase filenames, hooks use use-*.ts and schemas use *.schema.ts.

## Meaningful literals

Put error codes, permissions, roles, states, cookie/header names, routes, queue names, cache keys, limits, durations, motion/design tokens and storage keys in constants/enums. Use HttpStatus and minutes()/seconds(). Validate tunables through Zod AppConfig.
Lint rejects magic numbers except 0, 1, -1, enums, readonly properties and type indexes. Tests are exempt from literal restrictions. String comparisons, string switch cases and inline new Error messages are forbidden outside constants/catalogs/tests; typeof comparisons are permitted. Throw AppException(ErrorCode.X), translating messages at the boundary.
