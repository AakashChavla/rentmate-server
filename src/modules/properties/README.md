# properties

L1 property CRUD, cursor filters, archiving and per-type JSONB configuration use abstract PropertyService/Repository ports. Every service checks property-scoped permissions and organization ownership. The repository also implements the L0 OrganizationPropertyDirectory port through root wiring. See [Phase 3 report](../../../docs/ai/18-phase3-report.md).
