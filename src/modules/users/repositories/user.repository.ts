import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TenantScopedRepository } from '../../../core/database/base/tenant-scoped.repository';
import { User, UserStatus } from '../entities/user.entity';
import { decodeCursor, encodeCursor } from '../../../shared/cursor';

export interface UserListQuery {
  status?: UserStatus;
  search?: string;
  cursor?: string;
  limit?: number;
}

@Injectable()
export class UserRepository extends TenantScopedRepository<User> {
  constructor(dataSource: DataSource) {
    super(User, dataSource);
  }

  /**
   * The ONLY unscoped database query allowed in rentmate-server.
   * Executed strictly during initial authentication login / OTP lookups before the tenant organization is known.
   */
  async findByEmailForAuth(email: string): Promise<User | null> {
    const normalizedEmail = email.toLowerCase().trim();
    return this.repo.findOne({ where: { email: normalizedEmail } });
  }

  async findByIdInOrg(organizationId: string, userId: string): Promise<User | null> {
    const orgId = this.getOrgId(organizationId);
    return this.repo.findOne({ where: { id: userId, organizationId: orgId } });
  }

  async listPage(
    organizationId: string,
    query: UserListQuery,
  ): Promise<{ users: User[]; nextCursor: string | null; hasNext: boolean; limit: number }> {
    const orgId = this.getOrgId(organizationId);
    const limit = query.limit ?? 20;

    const qb = this.repo
      .createQueryBuilder('user')
      .where('user.organization_id = :orgId', { orgId });

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

  async saveUser(user: Partial<User> & { organizationId: string }): Promise<User> {
    const orgId = this.getOrgId(user.organizationId);
    const entity = this.repo.create({ ...user, organizationId: orgId });
    return this.repo.save(entity);
  }

  async updateLastLogin(organizationId: string, userId: string): Promise<void> {
    const orgId = this.getOrgId(organizationId);
    await this.repo.update({ id: userId, organizationId: orgId }, { lastLoginAt: new Date() });
  }
}
