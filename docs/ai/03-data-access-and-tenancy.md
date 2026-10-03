# Data access and tenancy

All database IO belongs in repository adapters; services/controllers/guards/processors cannot import TypeORM. Use intent-named methods, not find(options) pass-throughs.
Obtain organization identity only from a verified JWT. Compose scoped repositories, stamp inserts and execute targeted updates with id AND organization_id. Never re-save a previously read entity. Foreign organization lookups return 404. Composite FKs bind organization_id/user_id; indexes lead with organization_id.
TransactionRunner uses AsyncLocalStorage, joins nested transactions and resolves ambient managers in repositories. Schedule Redis effects after commit. Services do not see EntityManager.
Unit tests inject hand-written port fakes. Real database tests reflect over every tenant repository and reject public methods without isolation cases. Future tenants/leases/payments require repository isolation and race tests before shipping.
