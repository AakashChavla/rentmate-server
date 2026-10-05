import { Inject, Injectable } from '@nestjs/common';
import { DatabaseConnection } from '../../core/database/database-connection.contract';
import { UserRepository } from './users.contract';
import { UserEntity } from './user.entity';
import type { IdentityUser, UserPatch } from '../../shared/identity.types';
import { IDENTITY_LIMITS as L, USER_STATUS } from '../../shared/identity.constants';
import { AppException } from '../../core/errors/app-exception';
import { ErrorCode } from '../../core/errors/error-code.constants';
@Injectable()
export class TypeOrmUserRepository extends UserRepository {
  public constructor(@Inject(DatabaseConnection) private readonly db: DatabaseConnection) {
    super();
  }
  public override findByIdInOrg(organizationId: string, id: string): Promise<IdentityUser | null> {
    return this.db.withManager((m) =>
      m.getRepository(UserEntity).findOneBy({ organizationId, id }),
    );
  }
  public override async createInOrg(
    organizationId: string,
    input: Parameters<UserRepository['createInOrg']>[1],
    passwordHash: string,
  ): Promise<IdentityUser> {
    return this.db.withManager(async (m) => {
      const repository = m.getRepository(UserEntity);
      const entity = repository.create({
        ...input,
        organizationId,
        email: input.email.toLowerCase(),
        passwordHash,
      });
      const inserted = await repository.save(entity);
      const found = await repository.findOneByOrFail({ organizationId, id: inserted.id });
      return found;
    });
  }
  public override async recordLoginSuccess(
    organizationId: string,
    id: string,
    lastLoginAt: Date,
  ): Promise<void> {
    await this._patch(organizationId, id, { lastLoginAt });
  }
  public override async setPasswordHash(
    organizationId: string,
    id: string,
    passwordHash: string,
  ): Promise<void> {
    await this._patch(organizationId, id, { passwordHash });
  }
  public override async updateProfile(
    organizationId: string,
    id: string,
    patch: UserPatch,
  ): Promise<void> {
    await this._patch(organizationId, id, patch);
  }
  public override async setStatus(
    organizationId: string,
    id: string,
    status: IdentityUser['status'],
  ): Promise<void> {
    await this._patch(organizationId, id, { status });
  }
  public override async verifyEmail(
    organizationId: string,
    id: string,
    emailVerifiedAt: Date,
  ): Promise<void> {
    await this._patch(organizationId, id, { emailVerifiedAt, status: USER_STATUS.ACTIVE });
  }
  private async _patch(
    organizationId: string,
    id: string,
    patch: Partial<
      Pick<
        UserEntity,
        | 'fullName'
        | 'phone'
        | 'locale'
        | 'status'
        | 'lastLoginAt'
        | 'emailVerifiedAt'
        | 'passwordHash'
      >
    >,
  ): Promise<void> {
    await this.db.withManager(async (m) => {
      const result = await m.getRepository(UserEntity).update({ organizationId, id }, patch);
      if (!result.affected) throw new AppException(ErrorCode.NOT_FOUND);
    });
  }
  public override async listInOrg(
    org: string,
    cursor: string | undefined,
    status: string | undefined,
    search: string | undefined,
  ): ReturnType<UserRepository['listInOrg']> {
    return this.db.withManager(async (m) => {
      const query = m
        .getRepository(UserEntity)
        .createQueryBuilder('u')
        .where('u.organization_id=:org', { org })
        .orderBy('u.created_at', 'DESC')
        .addOrderBy('u.id', 'DESC')
        .addSelect(
          'to_char(u.created_at AT TIME ZONE \'UTC\', \'YYYY-MM-DD"T"HH24:MI:SS.US"Z"\')',
          'cursor_created_at',
        )
        .take(L.PAGE_SIZE + 1);
      if (status) query.andWhere('u.status=:status', { status });
      if (search)
        query.andWhere('(u.full_name ILIKE :search OR u.email ILIKE :search)', {
          search: `%${search.replaceAll('%', '\\%').replaceAll('_', '\\_')}%`,
        });
      if (cursor) {
        const parts = decodeCursor(cursor);
        query.andWhere('(u.created_at,u.id)<(:time,:id)', parts);
      }
      const result = await query.getRawAndEntities<{ u_id: string; cursor_created_at: string }>();
      const results = result.entities;
      const items = results.slice(0, L.PAGE_SIZE);
      const last = items.at(-1);
      return {
        items,
        nextCursor:
          results.length > L.PAGE_SIZE && last
            ? Buffer.from(
                JSON.stringify({
                  time: result.raw.find((row) => row.u_id === last.id)?.cursor_created_at,
                  id: last.id,
                }),
              ).toString('base64url')
            : null,
      };
    });
  }
}
function decodeCursor(cursor: string): { time: string; id: string } {
  try {
    const value: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString());
    if (
      !value ||
      typeof value !== 'object' ||
      !('time' in value) ||
      !('id' in value) ||
      typeof value.time !== 'string' ||
      typeof value.id !== 'string' ||
      !validCursorTime(value.time) ||
      !/^[-\da-f]{36}$/i.test(value.id)
    )
      throw new AppException(ErrorCode.INVALID_CURSOR);
    return { time: value.time, id: value.id };
  } catch {
    throw new AppException(ErrorCode.INVALID_CURSOR);
  }
}
function validCursorTime(time: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(time) && Number.isFinite(Date.parse(time));
}
