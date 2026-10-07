import { createHash } from 'node:crypto';
import type { EntityManager, EntityTarget, DeepPartial, FindOptionsWhere } from 'typeorm';
import type { BaseEntity } from '../../../src/core/database/base.entity';
import type { AppConfig } from '../../../src/core/config/app-config.contract';
import type { FileStorage } from '../../../src/integrations/file-storage/file-storage.contract';
import type { FieldEncryptor } from '../../../src/integrations/field-encryption/field-encryptor.contract';
import type { UserEntity } from '../../../src/modules/users/user.entity';
import type { PropertyEntity } from '../../../src/modules/properties/property.entity';
import type { UnitEntity } from '../../../src/modules/units/unit.entity';
import type { TenantEntity } from '../../../src/modules/tenants/tenant.entity';
import { DEMO } from './catalog';
export interface DemoContext {
  manager: EntityManager;
  config: AppConfig;
  storage: FileStorage;
  cipher: FieldEncryptor;
  orgId: string;
  passwordHash: string;
  today: Date;
  files: string[];
  users: Map<string, UserEntity>;
  properties: Map<string, PropertyEntity>;
  units: Map<string, UnitEntity[]>;
  tenants: TenantEntity[];
}
export function demoId(key: string): string {
  const hex = createHash('sha256')
    .update('rentmate:demo:v1:' + key)
    .digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
export function dateAt(context: DemoContext, days: number): string {
  return new Date(context.today.getTime() + days * DEMO.day).toISOString().slice(0, 10);
}
export function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('Incomplete demo fixture reference');
  return value;
}
export async function ensure<T extends BaseEntity>(
  context: DemoContext,
  entity: EntityTarget<T>,
  key: string,
  fields: DeepPartial<T>,
): Promise<T> {
  const repo = context.manager.getRepository(entity),
    id = demoId(context.orgId + ':' + key);
  return (
    (await repo.findOneBy({ id } as FindOptionsWhere<T>)) ??
    repo.save(Object.assign(repo.create(fields), { id }))
  );
}
