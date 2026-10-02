import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { GlobalRepository } from '../../../core/database/base/global.repository';
import { Organization } from '../entities/organization.entity';

@Injectable()
export class OrganizationRepository extends GlobalRepository<Organization> {
  constructor(dataSource: DataSource) {
    super(Organization, dataSource);
  }

  async findById(id: string): Promise<Organization | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    return this.repo.findOne({ where: { slug } });
  }

  async saveOrganization(data: Partial<Organization>): Promise<Organization> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }
}
