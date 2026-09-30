import type { FindOptionsWhere, Repository } from 'typeorm';
import { TenantRepository } from '../src/common/base/tenant.repository';
import { TenantScopeMissingError } from '../src/common/base/tenant-scope.error';
import { TenantBaseEntity } from '../src/common/base/tenant-base.entity';

class DemoRecord extends TenantBaseEntity {
  name!: string;
}

describe('TenantRepository', () => {
  const organizationId = '11111111-1111-4111-8111-111111111111';

  function createRepository() {
    const inner = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const repository = new TenantRepository(inner as unknown as Repository<DemoRecord>);
    return { inner, repository };
  }

  it('throws when find is called without an organization id', () => {
    const { inner, repository } = createRepository();

    expect(() => repository.find(undefined as unknown as string)).toThrow(TenantScopeMissingError);
    expect(() => repository.find('   ')).toThrow(TenantScopeMissingError);
    expect(inner.find).not.toHaveBeenCalled();
  });

  it('throws when update or delete is called without an organization id', () => {
    const { inner, repository } = createRepository();

    expect(() => repository.update('', { id: 'row' }, {})).toThrow(TenantScopeMissingError);
    expect(() => repository.delete(undefined as unknown as string, {})).toThrow(
      TenantScopeMissingError,
    );
    expect(inner.update).not.toHaveBeenCalled();
    expect(inner.delete).not.toHaveBeenCalled();
  });

  it('always appends the organization id to find filters', async () => {
    const { inner, repository } = createRepository();

    await repository.find(organizationId, {
      where: { id: 'row-1' } as FindOptionsWhere<DemoRecord>,
    });

    expect(inner.find).toHaveBeenCalledWith({
      where: { id: 'row-1', organizationId },
    });
  });

  it('overrides a caller-supplied organization id', async () => {
    const { inner, repository } = createRepository();

    await repository.find(organizationId, {
      where: { organizationId: 'other-org' } as FindOptionsWhere<DemoRecord>,
    });

    expect(inner.find).toHaveBeenCalledWith({
      where: { organizationId },
    });
  });
});
