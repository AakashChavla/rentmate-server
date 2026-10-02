import { Injectable, Optional } from '@nestjs/common';
import * as argon2 from 'argon2';

/**
 * Argon2id parameters aimed at roughly 300ms on a small server.
 * Tests use a reduced cost so the suite does not spend minutes hashing.
 */
export const PRODUCTION_ARGON2_OPTIONS: argon2.HashOptions = {
  type: argon2.argon2id,
  memoryCost: 65_536,
  timeCost: 3,
  parallelism: 1,
};

export const TEST_ARGON2_OPTIONS: argon2.HashOptions = {
  type: argon2.argon2id,
  memoryCost: 4_096,
  timeCost: 1,
  parallelism: 1,
};

const DUMMY_PASSWORD = 'dummy-password-not-a-user-secret';

@Injectable()
export class PasswordService {
  private dummyHash: Promise<string>;
  private readonly options: argon2.HashOptions;

  constructor(@Optional() options?: argon2.HashOptions) {
    this.options = options ?? PRODUCTION_ARGON2_OPTIONS;
    this.dummyHash = argon2.hash(DUMMY_PASSWORD, this.options);
  }

  hash(password: string): Promise<string> {
    return argon2.hash(password, this.options);
  }

  /**
   * Verifies a password. When the account has no hash, verifies the supplied
   * password against a precomputed dummy hash so missing users take similar time.
   */
  async verify(passwordHash: string | null, password: string): Promise<boolean> {
    const hash = passwordHash ?? (await this.dummyHash);
    try {
      const matches = await argon2.verify(hash, password);
      return passwordHash ? matches : false;
    } catch {
      return false;
    }
  }
}

export function assertPasswordPolicy(password: string): void {
  const valid =
    password.length >= 10 &&
    password.length <= 128 &&
    /[A-Za-z]/.test(password) &&
    /\d/.test(password);
  if (!valid) {
    throw new Error('Password must be 10–128 characters and include a letter and a number');
  }
}

export function argonOptionsFor(nodeEnv: string): argon2.HashOptions {
  return nodeEnv === 'test' ? TEST_ARGON2_OPTIONS : PRODUCTION_ARGON2_OPTIONS;
}
