import { randomUUID } from 'node:crypto';
import { Clock } from '../../core/time/clock.contract';
import { IdGenerator } from '../../core/ids/id-generator.contract';
import { PasswordHasher } from '../../integrations/password/password-hasher.contract';
import { TokenSigner } from '../../integrations/tokens/token-signer.contract';
import { OtpGenerator } from '../../integrations/otp/otp-generator.contract';
import { SecurityEventLogger } from '../../core/logger/security-event-logger.contract';
import { TransactionRunner } from '../../core/database/transaction-runner.contract';
import { FakeAuthRepository } from './fake-auth-repository';
import { FakeKeyValueStore } from './fake-key-value-store';
import { FakeAuthEmail } from './fake-auth-email';
import {
  FakeIdentityUsers,
  FakeIdentityOrganizations,
  FakeIdentityRoles,
  FakeIdentityContexts,
} from './fake-identity-directories';
import { DefaultSessionService } from '../../modules/auth/default-session.service';
import { DefaultOtpService } from '../../modules/auth/default-otp.service';
import { RedisLoginLockout } from '../../modules/auth/redis-login-lockout.store';
import { DefaultAuthService } from '../../modules/auth/default-auth.service';
import { NoneBotProtection } from '../../integrations/bot/adapters/none/none-bot-protection';
import { BlocklistEmailPolicy } from '../../integrations/email-policy/adapters/blocklist/blocklist-email-policy';
import type { SessionClaims } from '../../shared/identity.types';
export class MutableIdentityClock extends Clock {
  public instant = new Date();
  public override now(): Date {
    return new Date(this.instant);
  }
  public advance(ms: number): void {
    this.instant = new Date(this.instant.getTime() + ms);
  }
}
class FixtureIds extends IdGenerator {
  public override next(): string {
    return randomUUID();
  }
}
export class FakePasswords extends PasswordHasher {
  public dummyCalls = 0;
  public override hash(password: string): Promise<string> {
    return Promise.resolve(`fixture:${password}`);
  }
  public override verify(hash: string, password: string): Promise<boolean> {
    return Promise.resolve(hash === `fixture:${password}`);
  }
  public override dummyVerify(_password: string): Promise<void> {
    this.dummyCalls += 1;
    return Promise.resolve();
  }
}
export class FakeTokens extends TokenSigner {
  private readonly tokens = new Map<string, SessionClaims>();
  public override sign(claims: Omit<SessionClaims, 'iat'>, _refresh: boolean): Promise<string> {
    const token = randomUUID();
    this.tokens.set(token, { ...claims, iat: Date.now() / 1000 });
    return Promise.resolve(token);
  }
  public override verify(token: string, _refresh: boolean): Promise<SessionClaims> {
    const claims = this.tokens.get(token);
    if (!claims) throw new Error('Fixture token missing');
    return Promise.resolve(claims);
  }
}
export class FakeOtp extends OtpGenerator {
  public matchesCalls = 0;
  public override generate(): string {
    return '123456';
  }
  public override digest(code: string, context: string): string {
    return `${context}:${code}`;
  }
  public override matches(code: string, context: string, digest: string): boolean {
    this.matchesCalls += 1;
    return this.digest(code, context) === digest;
  }
}
export class FakeSecurityEvents extends SecurityEventLogger {
  public readonly events: string[] = [];
  public override record(event: Parameters<SecurityEventLogger['record']>[0]): void {
    this.events.push(event);
  }
}
class FixtureTransaction extends TransactionRunner {
  public transactions = 0;
  private effects: (() => Promise<void>)[] | undefined;
  public override async run<T>(action: () => Promise<T>): Promise<T> {
    if (this.effects) return action();
    this.transactions += 1;
    const effects: (() => Promise<void>)[] = [];
    this.effects = effects;
    try {
      const result = await action();
      this.effects = undefined;
      for (const effect of effects) await effect();
      return result;
    } finally {
      this.effects = undefined;
    }
  }
  public override afterCommit(effect: () => Promise<void>): Promise<void> {
    if (this.effects) {
      this.effects.push(effect);
      return Promise.resolve();
    }
    return effect();
  }
}
export class UnitIdentityFixture {
  public readonly repository = new FakeAuthRepository();
  public readonly store = new FakeKeyValueStore();
  public readonly clock = new MutableIdentityClock();
  public readonly ids = new FixtureIds();
  public readonly passwords = new FakePasswords();
  public readonly tokens = new FakeTokens();
  public readonly generator = new FakeOtp();
  public readonly events = new FakeSecurityEvents();
  public readonly tx = new FixtureTransaction();
  public readonly email = new FakeAuthEmail();
  public readonly users = new FakeIdentityUsers(this.repository);
  public readonly organizations = new FakeIdentityOrganizations();
  public readonly roles = new FakeIdentityRoles();
  public readonly contexts = new FakeIdentityContexts(this.users, this.organizations, this.roles);
  public readonly sessions = new DefaultSessionService(
    this.repository,
    this.tokens,
    this.store,
    this.tx,
    this.ids,
    this.clock,
    this.contexts,
    this.events,
  );
  public readonly otp = new DefaultOtpService(
    this.repository,
    this.generator,
    this.email,
    this.store,
    this.ids,
    this.clock,
    this.events,
  );
  public readonly lockout = new RedisLoginLockout(this.store, this.events);
  public readonly auth = new DefaultAuthService(
    this.repository,
    this.otp,
    this.sessions,
    this.sessions,
    this.lockout,
    this.organizations,
    this.users,
    this.roles,
    this.contexts,
    this.passwords,
    new NoneBotProtection(),
    new BlocklistEmailPolicy(),
    this.email,
    this.tx,
    this.ids,
    this.clock,
    this.events,
  );
}
