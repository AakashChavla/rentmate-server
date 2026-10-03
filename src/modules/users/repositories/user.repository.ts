import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TenantScopedRepository } from '../../../core/database/base/tenant-scoped.repository';
import { TenantScopeMissingError } from '../../../core/tenancy/tenant-scope.error';
import { User } from '../entities/user.entity';
import { UserStatus } from '../types/user-status';
import type { UserListQuery } from '../types/user-list-query';
import { decodeCursor, encodeCursor } from '../../../shared/cursor';

@Injectable()
export class UserRepository extends TenantScopedRepository<User> {
  constructor(dataSource: DataSource) {
    super(User, dataSource);
  }

  /**
   * The ONLY unscoped database query allowed in rentmate-server for users.
   * Executed strictly during initial authentication login / OTP lookups before the tenant organization is known.
   */
  async findByEmailForAuth(email: string): Promise<User | null> {
    const normalizedEmail = email.toLowerCase().trim();
    return this.unscopedForAuth.findOne({ where: { email: normalizedEmail } });
  }

  async findByIdInOrg(organizationId: string, userId: string): Promise<User | null> {
    const orgId = this.getOrgId(organizationId);
    return this.findOneScoped(orgId, { where: { id: userId } });
  }

  async listPage(
    organizationId: string,
    query: UserListQuery,
  ): Promise<{ users: User[]; nextCursor: string | null; hasNext: boolean; limit: number }> {
    const orgId = this.getOrgId(organizationId);
    const limit = query.limit ?? 20;

    const qb = this.scopedQueryBuilder(orgId, 'user');

    if (query.status) {
      qb.andWhere('user.status = :status', { status: query.status });
    }

    if (query.search) {
      const pattern = `%${query.search.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
      qb.andWhere("(user.email ILIKE :search OR user.full_name ILIKE :search ESCAPE '\\')", {
        search: pattern,
      });
    }

    if (query.cursor) {
      const cursor = decodeCursor(query.cursor);
      qb.andWhere('(user.created_at, user.id) < (:createdAt, :id)', {
        createdAt: cursor.createdAt,
        id: cursor.id,
      });
    }

    const rows = await qb
      .orderBy('user.created_at', 'DESC')
      .addOrderBy('user.id', 'DESC')
      .take(limit + 1)
      .getMany();

    const hasNext = rows.length > limit;
    const page = hasNext ? rows.slice(0, limit) : rows;
    const last = page.at(-1);
    const nextCursor = hasNext && last ? encodeCursor(last.createdAt, last.id) : null;

    return { users: page, nextCursor, hasNext, limit };
  }

  async createUser(user: Partial<User> & { organizationId: string }): Promise<User> {
    if ((user as { id?: string }).id) {
      throw new TenantScopeMissingError(
        'createUser must not be used with an existing id; use targeted update methods',
      );
    }
    const orgId = this.getOrgId(user.organizationId);
    const normalized = {
      ...user,
      organizationId: orgId,
      ...(user.email ? { email: user.email.toLowerCase().trim() } : {}),
    };
    return this.saveScoped(orgId, normalized);
  }

  async recordLoginSuccess(organizationId: string, userId: string): Promise<void> {
    const orgId = this.getOrgId(organizationId);
    await this.updateScoped(
      orgId,
      { id: userId },
      {
        lastLoginAt: new Date(),
        failedLoginCount: 0,
        lockedUntil: null,
      },
    );
  }

  async recordLoginFailure(
    organizationId: string,
    userId: string,
    threshold = 5,
    lockMs = 15 * 60 * 1000,
  ): Promise<void> {
    const orgId = this.getOrgId(organizationId);
    const lockUntilDate = new Date(Date.now() + lockMs);
    await this.scopedQueryBuilder(orgId, 'user')
      .update(User)
      .set({
        failedLoginCount: () =>
          'CASE WHEN locked_until IS NOT NULL AND locked_until <= NOW() THEN 1 ELSE failed_login_count + 1 END',
        lockedUntil: () =>
          `CASE WHEN (CASE WHEN locked_until IS NOT NULL AND locked_until <= NOW() THEN 1 ELSE failed_login_count + 1 END) >= ${threshold} THEN '${lockUntilDate.toISOString()}'::timestamptz ELSE NULL END`,
      })
      .where('id = :userId', { userId })
      .execute();
  }

  async setPasswordHash(
    organizationId: string,
    userId: string,
    passwordHash: string,
    status?: UserStatus,
  ): Promise<void> {
    const orgId = this.getOrgId(organizationId);
    const partial: Record<string, unknown> = {
      passwordHash,
      failedLoginCount: 0,
      lockedUntil: null,
    };
    if (status) {
      partial.status = status;
    }
    await this.updateScoped(orgId, { id: userId }, partial);
  }

  async updateProfile(
    organizationId: string,
    userId: string,
    profile: { fullName?: string; phone?: string | null },
  ): Promise<void> {
    const orgId = this.getOrgId(organizationId);
    const partial: Record<string, unknown> = {};
    if (profile.fullName !== undefined) partial.fullName = profile.fullName;
    if (profile.phone !== undefined) partial.phone = profile.phone;
    if (Object.keys(partial).length > 0) {
      await this.updateScoped(orgId, { id: userId }, partial);
    }
  }

  async setStatus(organizationId: string, userId: string, status: UserStatus): Promise<void> {
    const orgId = this.getOrgId(organizationId);
    await this.updateScoped(orgId, { id: userId }, { status });
  }

  async updateLastLogin(organizationId: string, userId: string): Promise<void> {
    const orgId = this.getOrgId(organizationId);
    await this.updateScoped(orgId, { id: userId }, { lastLoginAt: new Date() });
  }
}
