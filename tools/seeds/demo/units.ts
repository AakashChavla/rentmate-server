import { FloorEntity } from '../../../src/modules/units/floor.entity';
import { UnitEntity } from '../../../src/modules/units/unit.entity';
import { UnitConfigEntity } from '../../../src/modules/units/unit-config.entity';
import { BedEntity } from '../../../src/modules/beds/bed.entity';
import { unitConfiguration } from '../../../src/modules/units/unit-schema';
import {
  UNIT_STATUS as S,
  UNIT_TYPE as U,
  AMENITY,
  FURNISHING,
} from '../../../src/shared/unit.constants';
import { PROPERTY_TYPE as P } from '../../../src/shared/property.constants';
import { PROPERTIES } from './catalog';
import { ensure, required, type DemoContext } from './context';
export async function seedUnits(context: DemoContext): Promise<void> {
  for (const item of PROPERTIES) {
    const property = required(context.properties.get(item.key)),
      units: UnitEntity[] = [];
    for (let level = 1; level <= item.floors; level++) {
      const floor = await ensure(context, FloorEntity, 'floor:' + item.key + ':' + String(level), {
        organizationId: context.orgId,
        propertyId: property.id,
        name: 'Floor ' + String(level),
        level,
        wing: 'East',
      });
      for (let number = 1; number <= item.perFloor; number++) {
        const code = String(level * 100 + number);
        const unit = await createUnit(context, item, property.id, floor.id, code, number);
        units.push(unit);
      }
    }
    context.units.set(item.key, units);
  }
}
async function createUnit(
  context: DemoContext,
  item: (typeof PROPERTIES)[number],
  propertyId: string,
  floorId: string,
  code: string,
  number: number,
): Promise<UnitEntity> {
  const unit = await ensure(context, UnitEntity, 'unit:' + item.key + ':' + code, {
    organizationId: context.orgId,
    propertyId,
    floorId,
    code,
    type: item.type === P.HOTEL || item.type === P.PG ? U.ROOM : U.FLAT,
    status:
      [S.VACANT, S.VACANT, S.VACANT, S.RESERVED, S.MAINTENANCE, S.BLOCKED][number - 1] ?? S.VACANT,
    baseRent: item.rent,
    capacity: item.capacity,
  });
  await ensure(context, UnitConfigEntity, 'unit-config:' + unit.id, {
    organizationId: context.orgId,
    propertyId,
    unitId: unit.id,
    configuration: unitConfiguration({
      amenities: [AMENITY.WIFI, AMENITY.WARDROBE, AMENITY.GEYSER],
      size: item.type === P.APARTMENT ? '950.00' : '240.00',
      furnishing: FURNISHING.FULL,
    }),
  });
  if (item.type === P.PG)
    for (const label of ['A', 'B'])
      await ensure(context, BedEntity, 'bed:' + unit.id + ':' + label, {
        organizationId: context.orgId,
        propertyId,
        unitId: unit.id,
        label,
        status: S.VACANT,
      });
  return unit;
}
