import type { IsolationCase } from './isolation-harness';
import type { UnitIsolationContext } from './unit-isolation-context';
import { UNIT_INPUT, UNIT_CONFIG } from './unit-isolation-context';
export function unitReadCases(c: UnitIsolationContext): Record<string, IsolationCase> {
  const { units: r, foreign: org, property, unit, tx } = c;
  return {
    lockProperty: async () => {
      await expect(tx.run(() => r.lockProperty(org, property))).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    },
    get: async () => {
      expect(await r.get(org, unit.id)).toBeNull();
    },
    lock: async () => {
      expect(await tx.run(() => r.lock(org, unit.id))).toBeNull();
    },
    list: async () => {
      expect((await r.list(org, { propertyId: property }, undefined)).items).toEqual([]);
    },
    config: async () => {
      expect(await r.config(org, unit.id)).toBeNull();
    },
    counts: async () => {
      expect(await r.counts(org, property)).toEqual({ occupied: 0, total: 0 });
    },
    bedCount: async () => {
      expect(await r.bedCount(org, unit.id)).toBe(0);
    },
  };
}
export function unitWriteCases(c: UnitIsolationContext): Record<string, IsolationCase> {
  const { units: r, foreign: org, property, unit } = c;
  return {
    create: async () => {
      await expect(r.create(org, property, { ...UNIT_INPUT, code: 'Foreign' })).rejects.toThrow();
    },
    update: async () => {
      await expect(r.update(org, unit.id, { code: 'Spoof' })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    },
    remove: async () => {
      await expect(r.remove(org, unit.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    },
    setStatus: async () => {
      await expect(r.setStatus(org, unit.id, 'OCCUPIED')).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    },
    setConfig: async () => {
      await expect(
        r.setConfig(org, property, unit.id, { ...UNIT_CONFIG, amenities: [] }),
      ).rejects.toThrow();
    },
    bulk: async () => {
      await expect(
        r.bulk(org, property, [{ ...UNIT_INPUT, code: 'ForeignBulk' }]),
      ).rejects.toThrow();
    },
  };
}
