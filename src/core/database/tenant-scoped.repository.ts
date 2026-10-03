import { AppException } from '../errors/app-exception';
import { ErrorCode } from '../errors/error-code.constants';
import {
  TenantRepository,
  type TenantRecord,
  type TenantInsert,
  type TenantUpdate,
} from './tenant-repository.contract';
export abstract class TenantScopedRepository<T extends TenantRecord> {
  protected constructor(private readonly tenant: TenantRepository<T>) {}
  private scope(organizationId: string): void {
    if (!organizationId) throw new AppException(ErrorCode.FORBIDDEN);
  }
  public async findByIdInOrg(organizationId: string, id: string): Promise<T | null> {
    this.scope(organizationId);
    return this.tenant.findByIdInOrg(organizationId, id);
  }
  public async insertInOrg(organizationId: string, data: TenantInsert<T>): Promise<string> {
    this.scope(organizationId);
    return this.tenant.insertInOrg(organizationId, data);
  }
  public async updateInOrg(
    organizationId: string,
    id: string,
    patch: TenantUpdate<T>,
  ): Promise<void> {
    this.scope(organizationId);
    return this.tenant.updateInOrg(organizationId, id, patch);
  }
}
