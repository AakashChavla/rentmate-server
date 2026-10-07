import { LeaseFixture } from '../e2e/lease-fixture';
import { TenantRepository } from '../../modules/tenants';
import { DocumentRepository } from '../../modules/documents';
import { LeaseRepository } from '../../modules/leases';
import { TransactionRunner } from '../../core/database/transaction-runner.contract';
import { verifyIsolation } from './isolation-harness';
const f = new LeaseFixture();
beforeAll(() => f.start());
afterAll(() => f.close());
it('reflection covers every tenant, document and lease repository method', async () => {
  const context = await setupIsolation();
  await verifyIsolation(context.tenants, tenantCases(context));
  await verifyIsolation(context.docs, documentCases(context));
  await verifyIsolation(context.leases, leaseCases(context));
});
async function setupIsolation(): Promise<IsolationContext> {
  const owner = await f.account(),
    other = await f.account(),
    org = owner.me.organization.id,
    foreign = other.me.organization.id,
    p = await f.property(owner),
    t = await f.tenant(owner, p.id),
    u = await f.room(owner, p.id);
  await f.verify(owner, t);
  const tenants = f.app.get(TenantRepository),
    docs = f.app.get(DocumentRepository),
    leases = f.app.get(LeaseRepository),
    tx = f.app.get(TransactionRunner),
    doc = (await docs.list(org, t.id))[0];
  if (!doc) throw new Error('Missing document');
  const input = f.input(t.id, u.id),
    lease = await leases.create(org, p.id, input);
  return { tenants, docs, leases, tx, doc, input, lease, foreign, org, p, t, u, other };
}
interface IsolationContext {
  tenants: TenantRepository;
  docs: DocumentRepository;
  leases: LeaseRepository;
  tx: TransactionRunner;
  doc: import('../../shared/lease.types').DocumentRecord;
  input: import('../../shared/lease.types').LeaseInput;
  lease: import('../../shared/lease.types').LeaseRecord;
  foreign: string;
  org: string;
  p: import('../../shared/property.types').PropertyRecord;
  t: import('../../shared/lease.types').TenantView;
  u: import('../../shared/unit.types').UnitRecord;
  other: import('../e2e/identity-fixture').FixtureAccount;
}
function tenantCases(context: IsolationContext): Record<string, () => Promise<void>> {
  const { tenants, tx, foreign, org, p, t, other } = context;
  return {
    create: async () => {
      await expect(
        tenants.create(foreign, {
          propertyId: p.id,
          fullName: 'No',
          phone: '1',
          email: 'no@test.local',
          idCipher: null,
          idHash: null,
          idLastFour: null,
        }),
      ).rejects.toMatchObject({ code: '23503' });
    },
    get: async () => {
      expect(await tenants.get(foreign, t.id)).toBeNull();
    },
    lock: async () => {
      await tx.run(async () => {
        expect(await tenants.lock(foreign, t.id)).toBeNull();
      });
    },
    list: async () => {
      expect((await tenants.list(foreign, {}, undefined, undefined)).items).toEqual([]);
    },
    review: async () => {
      await expect(tenants.review(foreign, t.id, 'REJECTED', 'Wrong')).rejects.toThrow();
    },
    update: async () => {
      await expect(tenants.update(foreign, t.id, { phone: '2' })).rejects.toThrow();
    },
    linkInvitation: async () => {
      await tenants.linkInvitation(foreign, t.email, null, other.me.user.id);
      expect((await tenants.get(org, t.id))?.userId).toBeNull();
    },
  };
}
function documentCases(context: IsolationContext): Record<string, () => Promise<void>> {
  const { docs, doc, foreign, p, t, other } = context;
  return {
    create: async () => {
      await expect(
        docs.create(foreign, {
          propertyId: p.id,
          tenantId: t.id,
          type: 'PHOTO',
          storageKey: 'random',
          mime: 'image/png',
          size: 1,
          checksum: 'hash',
        }),
      ).rejects.toMatchObject({ code: '23503' });
    },
    get: async () => {
      expect(await docs.get(foreign, doc.id)).toBeNull();
    },
    list: async () => {
      expect(await docs.list(foreign, t.id)).toEqual([]);
    },
    review: async () => {
      await expect(
        docs.review(foreign, doc.id, 'REJECTED', other.me.user.id, 'Wrong'),
      ).rejects.toThrow();
    },
    remove: async () => {
      await expect(docs.remove(foreign, doc.id)).rejects.toThrow();
    },
  };
}
function leaseCases(context: IsolationContext): Record<string, () => Promise<void>> {
  const { leases, tx, input, lease, foreign, p, u } = context;
  return {
    create: async () => {
      await expect(leases.create(foreign, p.id, input)).rejects.toMatchObject({ code: '23503' });
    },
    get: async () => {
      expect(await leases.get(foreign, lease.id)).toBeNull();
    },
    lock: async () => {
      await tx.run(async () => {
        expect(await leases.lock(foreign, lease.id)).toBeNull();
      });
    },
    list: async () => {
      expect((await leases.list(foreign, {}, undefined, undefined)).items).toEqual([]);
    },
    overlap: async () => {
      expect(await leases.overlap(foreign, input)).toBe(false);
    },
    transition: async () => {
      await expect(leases.transition(foreign, lease.id, 'TERMINATED', {})).rejects.toThrow();
    },
    members: async () => {
      expect(await leases.members(foreign, lease.id)).toEqual([]);
    },
    due: async () => {
      const rows = await leases.due('2027-01-01', '2027-02-01');
      expect(rows.every((r) => Object.keys(r).sort().join(',') === 'id,organizationId')).toBe(true);
    },
    occupied: async () => {
      expect(await leases.occupied(foreign, u.id, null)).toBe(false);
    },
    protectedTarget: async () => {
      const repo = f.app.get<
        LeaseRepository & { protectedTarget: (o: string, id: string) => Promise<boolean> }
      >(LeaseRepository);
      expect(await repo.protectedTarget(foreign, u.id)).toBe(false);
    },
  };
}
