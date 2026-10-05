import { Injectable, Inject } from '@nestjs/common';
import { OrganizationRepository } from './organizations.contract';
import { OrganizationEntity } from './organization.entity';
import { DatabaseConnection } from '../../core/database/database-connection.contract';
import type { OrganizationRecord } from '../../shared/identity.types';
import type { Locale } from '../../shared/locale.constants';
@Injectable()
export class TypeOrmOrganizationRepository extends OrganizationRepository {
  public constructor(@Inject(DatabaseConnection) private readonly db: DatabaseConnection) {
    super();
  }
  public override get(id: string): Promise<OrganizationRecord | null> {
    return this.db.withManager((m) => m.getRepository(OrganizationEntity).findOneBy({ id }));
  }
  public override create(
    name: string,
    slug: string,
    defaultLocale: Locale,
  ): Promise<OrganizationRecord> {
    return this.db.withManager((m) =>
      m.getRepository(OrganizationEntity).save({ name, slug, defaultLocale, isActive: false }),
    );
  }
  public override async activate(id: string): Promise<void> {
    await this.db.withManager((m) =>
      m.getRepository(OrganizationEntity).update({ id }, { isActive: true }),
    );
  }
}
