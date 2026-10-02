import { Injectable } from '@nestjs/common';
import { DataSource, IsNull } from 'typeorm';
import { TenantScopedRepository } from '../../../core/database/base/tenant-scoped.repository';
import { OtpPurpose, OtpVerification } from '../entities/otp-verification.entity';

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
    return this.repo.findOne({
      where: {
        userId,
        purpose: purpose as OtpPurpose,
        organizationId: orgId,
        consumedAt: IsNull(),
      },
      order: { createdAt: 'DESC' },
    });
  }

  async saveOtp(
    otp: Partial<OtpVerification> & { organizationId: string },
  ): Promise<OtpVerification> {
    const orgId = this.getOrgId(otp.organizationId);
    const entity = this.repo.create({ ...otp, organizationId: orgId });
    return this.repo.save(entity);
  }

  async updateOtp(otp: OtpVerification): Promise<OtpVerification> {
    const orgId = this.getOrgId(otp.organizationId);
    return this.repo.save({ ...otp, organizationId: orgId });
  }

  async consumeOtp(organizationId: string, id: string): Promise<void> {
    const orgId = this.getOrgId(organizationId);
    await this.repo.update({ id, organizationId: orgId }, { consumedAt: new Date() });
  }
}
