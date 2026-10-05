import { Injectable, Inject } from '@nestjs/common';
import { hash, verify, argon2id } from 'argon2';
import { randomBytes } from 'node:crypto';
import { PasswordHasher } from '../../password-hasher.contract';
import { AppConfig } from '../../../../core/config/app-config.contract';
import { ENVIRONMENT } from '../../../../core/config/config.constants';
import { IDENTITY_LIMITS as L } from '../../../../shared/identity.constants';
@Injectable()
export class Argon2PasswordHasher extends PasswordHasher {
  private readonly dummy: Promise<string>;
  public constructor(@Inject(AppConfig) private readonly config: AppConfig) {
    super();
    this.dummy = this.hash(randomBytes(L.SECRET_MIN).toString('hex'));
  }
  public override hash(password: string): Promise<string> {
    const test = this.config.get('NODE_ENV') === ENVIRONMENT.TEST;
    return hash(password, {
      type: argon2id,
      memoryCost: test ? L.TEST_ARGON_MEMORY : L.ARGON_MEMORY,
      timeCost: test ? L.TEST_ARGON_TIME : L.ARGON_TIME,
      parallelism: L.ARGON_PARALLELISM,
    });
  }
  public override async verify(encoded: string, password: string): Promise<boolean> {
    try {
      return await verify(encoded, password);
    } catch {
      return false;
    }
  }
  public override async dummyVerify(password: string): Promise<void> {
    await this.verify(await this.dummy, password);
  }
}
