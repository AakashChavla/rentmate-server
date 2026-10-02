import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { GlobalRepository } from '../../../core/database/base/global.repository';
import { Permission } from '../entities/permission.entity';

@Injectable()
export class PermissionRepository extends GlobalRepository<Permission> {
  constructor(dataSource: DataSource) {
    super(Permission, dataSource);
  }

  async listAllPermissions(): Promise<Permission[]> {
    return this.repo.find({ order: { key: 'ASC' } });
  }

  async findByKey(key: string): Promise<Permission | null> {
    return this.repo.findOne({ where: { key } });
  }
}
