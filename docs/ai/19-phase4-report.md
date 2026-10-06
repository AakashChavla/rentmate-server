# Phase 4 report — units, beds and occupancy

Implemented in both repositories on phase/4-units-occupancy, branched from phase/3-organizations-properties. Local commits are authorized; nothing is pushed.

## Server behavior

L1 units, beds and occupancy use abstract ports and application-root bindings. Floors, units, beds, JSONB configuration and bulk job metadata carry organization ownership, composite parent foreign keys and organization-leading indexes. Units expose ROOM, FLAT and SHOP; beds are restricted to PG room units. Unit code is unique per property. Rent uses NUMERIC(12,2) and fixed-point decimal strings throughout HTTP and persistence; no float conversion is performed. Configuration validates amenity keys, uniqueness, decimal dimensions and furnishing.

Floors, units, beds and configuration support scoped CRUD. Every service enforces property ownership and unit permission; route authentication alone cannot grant access. Lists support cursor, property, floor, status, type and search filters. Floor metadata is joined without per-unit queries. Deleting a floor with units, an occupied/reserved unit or an occupied/reserved bed returns a conflict. Capacity cannot shrink below bed count; a room with beds cannot change to another unit type. Property locks serialize mutations and capacity checks; parent and archived-property state are rechecked after locking.

UnitStateMachine permits explicit transitions and idempotent same-state requests. Invalid transitions return ILLEGAL_UNIT_TRANSITION (409); optimistic expectedStatus conflicts return STALE_UNIT_STATUS (409). See [unit rules](../../src/modules/units/README.md). unit.status_changed publishes after commit; bed changes include bedId. Structure changes also invalidate occupancy.

Bulk patterns generate floor/sequence codes and create floors as needed. Up to BULK_SYNC_LIMIT=100 units are created synchronously in one transaction. Larger patterns, bounded at 10,000 units, persist a scoped job and publish to BullMQ after commit. The worker reloads the requesting actor's permissions, locks the job and atomically creates the whole batch. Duplicate batches roll back; terminal deliveries are idempotent. The status endpoint enforces property create permission.

OccupancyReadModel remains behind a port and uses two aggregate queries. Units and beds count separately; occupied means OCCUPIED and total includes all live statuses. Beds require a live parent unit. Empty totals yield zero; percentage is rounded to two decimal places. Redis caches snapshots for two minutes. Versioned conditional writes reject stale aggregate results during concurrent invalidation; status and structure changes invalidate after commit. See [occupancy rules](../../src/modules/occupancy/README.md).

## Client behavior

/units provides floor/wing grouped animated tiles with icons and localized status labels, floor/type/status filters, search and cursor loading. Drawers contain create/edit fields, configuration, amenity chips and PG bed management. Floor forms, a live bulk code preview and asynchronous job progress accompany the grid. Status changes send expectedStatus, update optimistically and roll back on failure. Mutation controls and navigation use scoped permissions; property selection is a filter only.

Dashboard and property overview use an accessible occupancy widget with AnimatedNumber, textual totals, progress bars and a lazy Recharts donut. Reduced motion is respected. All new UI/error strings have en/hi parity. Server openapi:export precedes client api:types; adapters use generated contracts.

## Verification

Server yarn verify: 94 unit tests, 43 HTTP tests and 21 real PostgreSQL/Redis integration tests. Client yarn verify: 54 tests and a production build. Verification includes every new repository method through reflection, Org A/Org B endpoint isolation, PROPERTY-scoped managers, hotel and PG CRUD, bed capacity/deletion races, synchronous and real BullMQ bulk jobs, duplicate rollback/idempotence, transition tables, exact money/schema boundaries, rounded occupancy, cache TTL/stale writers/invalidation, bounded list query counts, grid/bulk/error rollback/permission controls and automated accessibility.

Tests use only the isolated PostgreSQL 18.6 and Redis 8.10.2 fixture on ports 25432/26379. Application data and legacy volumes are preserved. The migrated schema produces an EMPTY diff. All 42 server and 31 client gate mutation proofs passed.

## Stable pins and limits

Node 26.10.0, PostgreSQL 18.6 and Redis 8.10.2 remain the selected stable non-prereleases. Registry checks covered the existing 95 direct dependencies. Phase 4 updates nodemailer to 10.0.15, typescript-eslint to 8.71.1, @radix-ui/react-slot to 1.4.0, radix-ui to 1.7.0 and Vite to 8.3.3. Recharts 3.10.1 and its matching react-is 19.3.0 peer and @types/react-is 19.3.0 are added. Existing TypeScript compiler compatibility exceptions remain; see [stable upgrade report](16-stable-upgrade-report.md).

Audits still block release: server has high braces plus moderate deprecated glob and sprintf-js advisories; client has high braces. Findings are not suppressed. Remote CI/CodeQL/Gitleaks, production HTTPS/SMTP, production Docker targets and a full browser visual/contrast review are not established by these local checks. Hindi requires human review. Queue/event after-commit callbacks are not a durable outbox. Phase 5 lease semantics and billing policy remain prerequisites, described in [roadmap](10-roadmap-and-status.md).
