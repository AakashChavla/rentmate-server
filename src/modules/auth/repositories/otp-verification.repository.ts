import { Injectable } from '@nestjs/common';
import { DataSource, IsNull } from 'typeorm';
import { TenantScopedRepository } from '../../../core/database/base/tenant-scoped.repository';
import { OtpVerification } from '../entities/otp-verification.entity';
import { OtpPurpose } from '../types/otp-purpose';

@Injectable()
export class OtpVerificationRepository extends TenantScopedRepository<OtpVerification> {
  constructor(dataSource: DataSource) {
    super(OtpVerification, dataSource);
  }

  async findLatestActive(
    organizationId: string,
    userId: string,
    purpose: OtpPurpose | string,
  ): Promise<OtpVerification | null> {
    const orgId = this.getOrgId(organizationId);
    return this.findOneScoped(orgId, {
      where: {
        userId,
        purpose: purpose as OtpPurpose,
        consumedAt: IsNull(),
      },
      order: { createdAt: 'DESC' },
    });
  }

  async saveOtp(
    otp: Partial<OtpVerification> & { organizationId: string },
  ): Promise<OtpVerification> {
    const orgId = this.getOrgId(otp.organizationId);
    return this.saveScoped(orgId, otp);
  }

  async updateOtp(
    organizationIdOrOtp: string | OtpVerification,
    otp?: OtpVerification,
  ): Promise<OtpVerification> {
    const targetOtp = typeof organizationIdOrOtp === 'string' ? otp! : organizationIdOrOtp;
    const orgId =
      typeof organizationIdOrOtp === 'string'
        ? this.getOrgId(organizationIdOrOtp)
        : this.getOrgId(targetOtp.organizationId);
    return this.saveScoped(orgId, targetOtp);
  }

  async consumeOtp(organizationId: string, id: string): Promise<void> {
    const orgId = this.getOrgId(organizationId);
    await this.updateScoped(orgId, { id }, { consumedAt: new Date() });
  }
}
