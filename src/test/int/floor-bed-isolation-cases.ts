import type { IsolationCase } from './isolation-harness';
import type { UnitIsolationContext } from './unit-isolation-context';
import { BULK_INPUT } from './unit-isolation-context';
export function floorCases(c: UnitIsolationContext): Record<string, IsolationCase> {
  const { floors: r, foreign: org, property, floor } = c;
  return {
    create: async () => {
      await expect(r.create(org, property, { name: 'Foreign', level: 99 })).rejects.toThrow();
    },
    get: async () => {
      expect(await r.get(org, floor.id)).toBeNull();
    },
    list: async () => {
      expect(await r.list(org, property)).toEqual([]);
    },
    update: async () => {
      await expect(r.update(org, floor.id, { name: 'Spoof' })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    },
    remove: async () => {
      await expect(r.remove(org, floor.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    },
    hasUnits: async () => {
      expect(await r.hasUnits(org, floor.id)).toBe(false);
    },
    ensure: async () => {
      await expect(r.ensure(org, property, 99, 'F')).rejects.toThrow();
    },
  };
}
export function bedCases(c: UnitIsolationContext): Record<string, IsolationCase> {
  const { beds: r, foreign: org, property, unit, bed, tx } = c;
  return {
    create: async () => {
      await expect(r.create(org, property, unit.id, 'Foreign')).rejects.toThrow();
    },
    get: async () => {
      expect(await r.get(org, bed.id)).toBeNull();
    },
    lock: async () => {
      expect(await tx.run(() => r.lock(org, bed.id))).toBeNull();
    },
    list: async () => {
      expect(await r.list(org, unit.id)).toEqual([]);
    },
    update: async () => {
      await expect(r.update(org, bed.id, 'Spoof')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    },
    remove: async () => {
      await expect(r.remove(org, bed.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    },
    setStatus: async () => {
      await expect(r.setStatus(org, bed.id, 'OCCUPIED')).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    },
    counts: async () => {
      expect(await r.counts(org, property)).toEqual({ occupied: 0, total: 0 });
    },
  };
}
export function jobCases(c: UnitIsolationContext): Record<string, IsolationCase> {
  const { jobs: r, foreign: org, property, owner, job, tx } = c;
  return {
    create: async () => {
      await expect(r.create(org, property, owner.me.user.id, BULK_INPUT)).rejects.toThrow();
    },
    get: async () => {
      expect(await r.get(org, job.id)).toBeNull();
    },
    lock: async () => {
      expect(await tx.run(() => r.lock(org, job.id))).toBeNull();
    },
    update: async () => {
      await expect(r.update(org, job.id, 'FAILED', 0)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    },
  };
}
