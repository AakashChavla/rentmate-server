import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { GlobalRepository } from '../../../core/database/base/global.repository';
import { Role } from '../entities/role.entity';

@Injectable()
export class RoleRepository extends GlobalRepository<Role> {
  constructor(dataSource: DataSource) {
    super(Role, dataSource);
  }

  async findByKey(key: string): Promise<Role | null> {
    return this.repo.findOne({ where: { key } });
  }

  async findById(id: string): Promise<Role | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findSystemRoleByKey(key: string): Promise<Role | null> {
    return this.repo.findOne({ where: { key, isSystem: true } });
  }

  async listRoles(): Promise<Role[]> {
    return this.repo.find({ order: { key: 'ASC' } });
  }
}
