import {
  TenantRepository,
  type TenantInsert,
  type TenantUpdate,
} from './tenant-repository.contract';
import { TenantScopedRepository } from './tenant-scoped.repository';
interface Item {
  id: string;
  organizationId: string;
  name: string;
}
class MemoryRepository extends TenantRepository<Item> {
  public readonly rows = new Map<string, Item>();
  public override async findByIdInOrg(org: string, id: string): Promise<Item | null> {
    await Promise.resolve();
    const row = this.rows.get(id);
    return row?.organizationId === org ? row : null;
  }
  public override async insertInOrg(org: string, data: TenantInsert<Item>): Promise<string> {
    await Promise.resolve();
    const id = 'item-1';
    this.rows.set(id, { ...data, id, organizationId: org });
    return id;
  }
  public override async updateInOrg(
    org: string,
    id: string,
    patch: TenantUpdate<Item>,
  ): Promise<void> {
    const row = await this.findByIdInOrg(org, id);
    if (!row) throw new Error('not-found');
    this.rows.set(id, { ...row, ...patch, id, organizationId: org });
  }
}
class Items extends TenantScopedRepository<Item> {
  public constructor(low: TenantRepository<Item>) {
    super(low);
  }
}
describe('scoped repository port', () => {
  it('requires scope, stamps inserts and isolates reads and writes', async () => {
    const low = new MemoryRepository();
    const repo = new Items(low);
    await expect(repo.insertInOrg('', { name: 'test' })).rejects.toThrow();
    const id = await repo.insertInOrg('org-a', { name: 'test' });
    expect(await repo.findByIdInOrg('org-b', id)).toBeNull();
    await expect(repo.updateInOrg('org-b', id, { name: 'stolen' })).rejects.toThrow();
    expect(low.rows.get(id)?.name).toBe('test');
  });
});
