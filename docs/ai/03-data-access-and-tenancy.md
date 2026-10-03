Obtain organization identity only from verified tokens. Compose scoped repositories; never expose raw Prisma clients. Stamp inserts and scope every update by id and organization. Return 404 for foreign organization records. Use composite foreign keys and organization-leading indexes. Resolve transactions through AsyncLocalStorage; defer Redis effects until commit.

