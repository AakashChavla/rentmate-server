import { Inject, Injectable } from '@nestjs/common';
import { LoginLockout } from './login-lockout.contract';
import { KeyValueStore } from '../../core/redis/key-value-store.contract';
import { AppException } from '../../core/errors/app-exception';
import { ErrorCode } from '../../core/errors/error-code.constants';
import { SecurityEventLogger } from '../../core/logger/security-event-logger.contract';
import {
  IDENTITY_KEYS as K,
  IDENTITY_TTL as T,
  IDENTITY_LIMITS as L,
  SECURITY_EVENT as E,
} from '../../shared/identity.constants';
import { sha256 } from './default-session.service';
@Injectable()
export class RedisLoginLockout extends LoginLockout {
  public constructor(
    @Inject(KeyValueStore) private readonly store: KeyValueStore,
    @Inject(SecurityEventLogger) private readonly events: SecurityEventLogger,
  ) {
    super();
  }
  public override async check(email: string, ip: string): Promise<void> {
    const locked = await this.store.get(K.loginLock(sha256(email), ip));
    if (locked) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((Number(locked) - Date.now()) / T.MILLISECONDS),
      );
      throw new AppException(ErrorCode.TOO_MANY_ATTEMPTS, { retryAfterSeconds });
    }
  }
  public override async failure(email: string, ip: string): Promise<void> {
    const key = sha256(email);
    const count = await this.store.incrementWindow(K.login(key, ip), T.LOCKOUT);
    this.events.record(E.LOGIN_FAILURE, { email });
    if (count >= L.LOGIN_FAILURES) {
      await this.store.set(K.loginLock(key, ip), String(Date.now() + T.LOCKOUT), T.LOCKOUT);
      this.events.record(E.LOGIN_LOCKED, { email });
      throw new AppException(ErrorCode.TOO_MANY_ATTEMPTS, {
        retryAfterSeconds: T.LOCKOUT / T.MILLISECONDS,
      });
    }
  }
  public override async success(email: string, ip: string): Promise<void> {
    await this.store.delete(K.login(sha256(email), ip));
  }
}
