# Beds (L1)

Bed service and repository are abstract ports. Every read and mutation validates organization ownership, the parent unit, its property, the caller's property-scoped unit permission, and PG room eligibility. Property locks serialize capacity checks and mutations. Composite foreign keys reject cross-organization/property parents. Bed labels are unique within the unit, including deleted beds. Bed statuses use UnitStateMachine and expose optimistic expectedStatus conflicts. Occupied or reserved beds cannot be deleted.

Bed status and structure changes invalidate the property's occupancy snapshot after commit. Bed occupancy counts only live beds with live parent units; units and beds maintain separate status counts. Phase 5 will supply the lease-driven relationship between unit and bed occupancy.
