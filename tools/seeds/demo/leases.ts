import { LeaseEntity } from '../../../src/modules/leases/lease.entity';
import { LeaseMemberEntity } from '../../../src/modules/leases/lease-member.entity';
import { BedEntity } from '../../../src/modules/beds/bed.entity';
import { UnitEntity } from '../../../src/modules/units/unit.entity';
import { LEASE_STATUS as L } from '../../../src/shared/lease.constants';
import { UNIT_STATUS } from '../../../src/shared/unit.constants';
import { BOOKINGS } from './catalog';
import type { DeepPartial } from 'typeorm';
import { demoId, dateAt, ensure, required, type DemoContext } from './context';
export async function seedLeases(context: DemoContext): Promise<void> {
  for (const item of BOOKINGS) {
    const id = demoId(context.orgId + ':lease:' + item.key);
    if (await context.manager.getRepository(LeaseEntity).findOneBy({ id })) continue;
    const tenant = required(context.tenants[item.tenant]);
    const unit = required(required(context.units.get(item.property))[item.unit]);
    const bedId = 'bed' in item ? demoId(context.orgId + ':bed:' + unit.id + ':' + item.bed) : null;
    const activated = [L.ACTIVE, L.EXPIRING, L.RENEWED].some((status) => status === item.status);
    const lease = await ensure(
      context,
      LeaseEntity,
      'lease:' + item.key,
      leaseFields(context, item, unit, tenant.id, bedId, activated),
    );
    if (activated) await occupy(context, unit.id, bedId);
    if (item.key === 'apartment-renewed')
      await ensure(context, LeaseMemberEntity, 'member:' + lease.id, {
        organizationId: context.orgId,
        leaseId: lease.id,
        fullName: 'Surya Krishnan',
      });
  }
}
function leaseFields(
  context: DemoContext,
  item: (typeof BOOKINGS)[number],
  unit: UnitEntity,
  tenantId: string,
  bedId: string | null,
  activated: boolean,
): DeepPartial<LeaseEntity> {
  return {
    organizationId: context.orgId,
    propertyId: unit.propertyId,
    tenantId,
    unitId: unit.id,
    bedId,
    startDate: dateAt(context, item.start),
    endDate: dateAt(context, item.end),
    rent: item.property === 'pg' ? '9500.00' : unit.baseRent,
    deposit: item.property === 'pg' ? '19000.00' : '28000.00',
    dueDay: 5,
    status: item.status,
    renewedFromId:
      'renewedFrom' in item ? demoId(context.orgId + ':lease:' + item.renewedFrom) : null,
    depositRecordedAt: activated ? context.today : null,
    depositReference: activated ? 'DEMO-RECEIPT-' + item.key : null,
    terminatedAt: item.status === L.TERMINATED ? context.today : null,
    terminateReason: item.status === L.TERMINATED ? 'Demo: occupant relocated.' : null,
  };
}
async function occupy(context: DemoContext, unitId: string, bedId: string | null): Promise<void> {
  await context.manager
    .getRepository(UnitEntity)
    .update({ organizationId: context.orgId, id: unitId }, { status: UNIT_STATUS.OCCUPIED });
  if (bedId)
    await context.manager
      .getRepository(BedEntity)
      .update({ organizationId: context.orgId, id: bedId }, { status: UNIT_STATUS.OCCUPIED });
}
