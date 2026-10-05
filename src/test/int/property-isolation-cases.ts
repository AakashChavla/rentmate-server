import { randomUUID } from 'node:crypto';
import { PropertyRepository } from '../../modules/properties';
import type { PropertyRecord } from '../../shared/property.types';
import { PROPERTY_INPUT } from '../e2e/property-fixture';
import type { IsolationCase } from './isolation-harness';
interface Context {
  repo: PropertyRepository;
  org: string;
  foreign: string;
  property: PropertyRecord;
  other: PropertyRecord;
}
export function propertyReadCases({
  repo,
  org,
  foreign,
  property,
  other,
}: Context): Record<string, IsolationCase> {
  return {
    exists: async () => {
      expect(await repo.exists(foreign, property.id)).toBe(false);
      expect(await repo.exists(org, property.id)).toBe(true);
    },
    hasAny: async () => {
      expect(await repo.hasAny(org)).toBe(true);
      expect(await repo.hasAny(randomUUID())).toBe(false);
    },
    get: async () => {
      expect(await repo.get(foreign, property.id)).toBeNull();
      expect((await repo.get(org, property.id))?.id).toBe(property.id);
    },
    list: async () => {
      expect((await repo.list(org, {}, undefined)).items.map((p) => p.id)).not.toContain(other.id);
      expect((await repo.list(foreign, { propertyId: property.id }, undefined)).items).toEqual([]);
      expect((await repo.list(org, {}, [other.id])).items).toEqual([]);
    },
    getConfig: async () => {
      expect(await repo.getConfig(foreign, property.id)).toBeNull();
      expect(await repo.getConfig(org, property.id)).not.toBeNull();
    },
  };
}
export function propertyWriteCases({
  repo,
  org,
  foreign,
  property,
  other,
}: Context): Record<string, IsolationCase> {
  return {
    create: async () => {
      const created = await repo.create(org, PROPERTY_INPUT);
      expect(created.organizationId).toBe(org);
      expect(await repo.get(foreign, created.id)).toBeNull();
    },
    update: async () => {
      await expect(repo.update(foreign, property.id, { name: 'Spoof' })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
      await repo.update(org, property.id, { name: 'Scoped edit' });
      expect((await repo.get(foreign, other.id))?.name).toBe(other.name);
    },
    remove: async () => {
      await expect(repo.remove(foreign, property.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
      const created = await repo.create(org, PROPERTY_INPUT);
      await repo.remove(org, created.id);
      expect(await repo.get(org, created.id)).toBeNull();
    },
    ...configWriteCases({ repo, org, foreign, property, other }),
  };
}
function configWriteCases({
  repo,
  org,
  foreign,
  property,
}: Context): Record<string, IsolationCase> {
  return {
    setConfig: async () => {
      await expect(repo.setConfig(foreign, property.id, { currency: 'INR' })).rejects.toThrow();
      await repo.setConfig(org, property.id, {
        currency: 'INR',
        checkInTime: '14:00',
        checkOutTime: '11:00',
      });
      expect((await repo.getConfig(org, property.id))?.currency).toBe('INR');
    },
    patchConfig: async () => {
      await expect(
        repo.patchConfig(foreign, property.id, { checkInTime: '16:00' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
      const result = await repo.patchConfig(org, property.id, { checkInTime: '16:00' });
      expect(result.checkInTime).toBe('16:00');
      expect(result.checkOutTime).toBe('11:00');
    },
  };
}
