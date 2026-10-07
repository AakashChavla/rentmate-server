// Exact, injective UUID slot encoding: two signed 64-bit halves form one numeric point.
// NULL bed IDs produce an unbounded slot range, conflicting with every bed in the unit.
const BED_SLOT = `(('x'||substr(replace("bed_id"::text,'-',''),1,16))::bit(64)::bigint)::numeric * 18446744073709551616 + (('x'||substr(replace("bed_id"::text,'-',''),17,16))::bit(64)::bigint)::numeric`;
export const LEASE_UNIT_BED_EXCLUSION = `USING gist ("organization_id" WITH =, "unit_id" WITH =, numrange(${BED_SLOT},${BED_SLOT},'[]') WITH &&, daterange("start_date","end_date",'[)') WITH &&) WHERE ("status" NOT IN ('EXPIRED','TERMINATED') AND "deleted_at" IS NULL)`;
