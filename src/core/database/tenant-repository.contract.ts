export interface TenantRecord {
  id: string;
  organizationId: string;
}
export type TenantInsert<T extends TenantRecord> = Omit<
  T,
  'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'deletedAt'
>;
export type TenantUpdate<T extends TenantRecord> = Partial<TenantInsert<T>>;
export abstract class TenantRepository<T extends TenantRecord> {
  public abstract findByIdInOrg(organizationId: string, id: string): Promise<T | null>;
  public abstract insertInOrg(organizationId: string, data: TenantInsert<T>): Promise<string>;
  public abstract updateInOrg(
    organizationId: string,
    id: string,
    patch: TenantUpdate<T>,
  ): Promise<void>;
}
