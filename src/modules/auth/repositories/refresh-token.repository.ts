import { Injectable } from '@nestjs/common';
import { DataSource, IsNull } from 'typeorm';
import { TenantScopedRepository } from '../../../core/database/base/tenant-scoped.repository';
import { RefreshToken } from '../entities/refresh-token.entity';

@Injectable()
export class RefreshTokenRepository extends TenantScopedRepository<RefreshToken> {
  constructor(dataSource: DataSource) {
    super(RefreshToken, dataSource);
  }

  async findByJti(jti: string): Promise<RefreshToken | null> {
    return this.repo.findOne({ where: { id: jti } });
  }

  async saveToken(
    token: Partial<RefreshToken> & { organizationId: string },
  ): Promise<RefreshToken> {
    const orgId = this.getOrgId(token.organizationId);
    const entity = this.repo.create({ ...token, organizationId: orgId });
    return this.repo.save(entity);
  }

  async revokeFamily(organizationId: string, familyId: string): Promise<void> {
    const orgId = this.getOrgId(organizationId);
    await this.repo.update(
      { familyId, organizationId: orgId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  async revokeAllForUser(organizationId: string, userId: string): Promise<void> {
    const orgId = this.getOrgId(organizationId);
    await this.repo.update(
      { userId, organizationId: orgId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  async updateToken(token: RefreshToken): Promise<RefreshToken> {
    const orgId = this.getOrgId(token.organizationId);
    return this.repo.save({ ...token, organizationId: orgId });
  }
}
