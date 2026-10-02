import { Injectable } from '@nestjs/common';
import { DataSource, IsNull } from 'typeorm';
import { TenantScopedRepository } from '../../../core/database/base/tenant-scoped.repository';
import { RefreshToken } from '../entities/refresh-token.entity';

@Injectable()
export class RefreshTokenRepository extends TenantScopedRepository<RefreshToken> {
  constructor(dataSource: DataSource) {
    super(RefreshToken, dataSource);
  }

  /**
   * Allow-listed unscoped method for refresh token verification by JTI.
   */
  async findByJti(jti: string): Promise<RefreshToken | null> {
    return this.unscopedForAuth.findOne({ where: { id: jti } });
  }

  async saveToken(
    token: Partial<RefreshToken> & { organizationId: string },
  ): Promise<RefreshToken> {
    const orgId = this.getOrgId(token.organizationId);
    return this.saveScoped(orgId, token);
  }

  async revokeFamily(organizationId: string, familyId: string): Promise<void> {
    const orgId = this.getOrgId(organizationId);
    await this.updateScoped(orgId, { familyId, revokedAt: IsNull() }, { revokedAt: new Date() });
  }

  async revokeAllForUser(organizationId: string, userId: string): Promise<void> {
    const orgId = this.getOrgId(organizationId);
    await this.updateScoped(orgId, { userId, revokedAt: IsNull() }, { revokedAt: new Date() });
  }

  async updateToken(
    organizationIdOrToken: string | RefreshToken,
    token?: RefreshToken,
  ): Promise<RefreshToken> {
    const targetToken = typeof organizationIdOrToken === 'string' ? token! : organizationIdOrToken;
    const orgId =
      typeof organizationIdOrToken === 'string'
        ? this.getOrgId(organizationIdOrToken)
        : this.getOrgId(targetToken.organizationId);
    return this.saveScoped(orgId, targetToken);
  }
}
