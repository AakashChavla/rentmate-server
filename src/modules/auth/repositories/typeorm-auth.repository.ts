import { Inject, Injectable } from '@nestjs/common';
import { IsNull, Not } from 'typeorm';
import { DatabaseConnection } from '../../../core/database/database-connection.contract';
import { AuthRepository, type PasswordIdentity } from './auth.repository.contract';
import { RefreshTokenEntity } from '../entities/refresh-token.entity';
import { OtpVerificationEntity } from '../entities/otp-verification.entity';
import { CONSENT, USER_STATUS } from '../../../shared/identity.constants';
import type { RefreshRecord, OtpRecord, RegistrationInput } from '../../../shared/identity.types';
@Injectable()
export class TypeOrmAuthRepository extends AuthRepository {
  public constructor(@Inject(DatabaseConnection) private readonly db: DatabaseConnection) {
    super();
  }
  public override async findIdentity(email: string): Promise<PasswordIdentity | null> {
    return this.db.withManager(async (m) => {
      const row = await m
        .getRepository<PasswordIdentity['user'] & { passwordHash: string | null }>('UserEntity')
        .createQueryBuilder('u')
        .addSelect('u.passwordHash')
        .where('lower(u.email)=:email', { email: email.toLowerCase() })
        .getOne();
      if (!row) return null;
      const { passwordHash, ...user } = row;
      return { user, passwordHash };
    });
  }
  public override async createRefresh(record: RefreshRecord): Promise<void> {
    await this.db.withManager((m) => m.getRepository(RefreshTokenEntity).insert(record));
  }
  public override refresh(
    organizationId: string,
    userId: string,
    id: string,
  ): Promise<RefreshRecord | null> {
    return this.db.withManager((m) =>
      m.getRepository(RefreshTokenEntity).findOneBy({ organizationId, userId, id }),
    );
  }
  public override async rotate(
    organizationId: string,
    userId: string,
    id: string,
    replacement: RefreshRecord,
    revokedAt: Date,
  ): Promise<boolean> {
    return this.db.withManager(async (m) => {
      const changed = await m
        .getRepository(RefreshTokenEntity)
        .update(
          { organizationId, userId, id, revokedAt: IsNull() },
          { revokedAt, replacedById: replacement.id },
        );
      if (!changed.affected) return false;
      await m.getRepository(RefreshTokenEntity).insert(replacement);
      return true;
    });
  }
  public override async revokeFamily(
    organizationId: string,
    userId: string,
    familyId: string,
    revokedAt: Date,
  ): Promise<void> {
    await this.db.withManager((m) =>
      m
        .getRepository(RefreshTokenEntity)
        .update({ organizationId, userId, familyId, revokedAt: IsNull() }, { revokedAt }),
    );
  }
  public override async revokeUser(
    organizationId: string,
    userId: string,
    time: Date,
    exceptFamily?: string,
  ): Promise<string[]> {
    return this.db.withManager(async (m) => {
      const where = {
        organizationId,
        userId,
        ...(exceptFamily ? { familyId: Not(exceptFamily) } : {}),
      };
      const records = await m.getRepository(RefreshTokenEntity).findBy(where);
      await m
        .getRepository(RefreshTokenEntity)
        .update({ ...where, revokedAt: IsNull() }, { revokedAt: time });
      return [...new Set(records.map((r) => r.familyId))];
    });
  }
  public override async createOtp(record: Omit<OtpRecord, 'consumedAt'>): Promise<void> {
    await this.db.withManager(async (m) => {
      await m.getRepository(OtpVerificationEntity).update(
        {
          organizationId: record.organizationId,
          userId: record.userId,
          purpose: record.purpose,
          consumedAt: IsNull(),
        },
        { consumedAt: new Date() },
      );
      await m.getRepository(OtpVerificationEntity).insert(record);
    });
  }
  public override latestOtp(
    organizationId: string,
    userId: string,
    purpose: OtpRecord['purpose'],
  ): Promise<OtpRecord | null> {
    return this.db.withManager((m) =>
      m.getRepository(OtpVerificationEntity).findOne({
        where: { organizationId, userId, purpose, consumedAt: IsNull() },
        order: { createdAt: 'DESC' },
      }),
    );
  }
  public override async consumeOtp(
    organizationId: string,
    userId: string,
    id: string,
    consumedAt: Date,
  ): Promise<boolean> {
    return this.db.withManager(async (m) => {
      const result = await m
        .getRepository(OtpVerificationEntity)
        .createQueryBuilder()
        .update()
        .set({ consumedAt })
        .where(
          'organization_id=:organizationId AND user_id=:userId AND id=:id AND consumed_at IS NULL AND expires_at>:consumedAt',
          { organizationId, userId, id, consumedAt },
        )
        .execute();
      return !!result.affected;
    });
  }
  public override async consent(
    organizationId: string,
    userId: string,
    input: RegistrationInput,
    ip: string,
    acceptedAt: Date,
  ): Promise<void> {
    await this.db.withManager((m) =>
      m.getRepository('UserConsentEntity').insert(
        [CONSENT.TERMS, CONSENT.PRIVACY].map((documentType) => ({
          organizationId,
          userId,
          documentType,
          version: input.termsVersion,
          ip,
          acceptedAt,
        })),
      ),
    );
  }
  public override async cleanup(before: Date): Promise<number> {
    return this.db.withManager(async (m) => {
      const rows = await m.query<{ id: string }[]>(
        'DELETE FROM organizations o WHERE o.is_active=false AND o.created_at<$1 AND NOT EXISTS(SELECT 1 FROM users u WHERE u.organization_id=o.id AND u.status<>$2) RETURNING id',
        [before, USER_STATUS.PENDING],
      );
      return rows.length;
    });
  }
}
