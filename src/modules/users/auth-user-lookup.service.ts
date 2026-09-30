import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class AuthUserLookup {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  /**
   * Login, OTP, and password reset start from an email, before any organization
   * is known. This is the only user query allowed to omit organization_id.
   * After the row is loaded, every read and write goes through TenantRepository
   * with `user.organizationId` from this result. Never take that id from the
   * request body, query, or route params.
   */
  findByEmail(email: string): Promise<User | null> {
    return this.users.findOne({ where: { email: email.trim().toLowerCase() } });
  }
}
