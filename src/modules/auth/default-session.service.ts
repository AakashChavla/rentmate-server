import { Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { SessionService } from './session.service.contract';
import { SessionVerifier, SessionRevoker } from './session.contract';
import { AuthRepository } from './repositories/auth.repository.contract';
import { TokenSigner } from '../../integrations/tokens/token-signer.contract';
import { KeyValueStore } from '../../core/redis/key-value-store.contract';
import { TransactionRunner } from '../../core/database/transaction-runner.contract';
import { IdGenerator } from '../../core/ids/id-generator.contract';
import { Clock } from '../../core/time/clock.contract';
import { AppException } from '../../core/errors/app-exception';
import { ErrorCode } from '../../core/errors/error-code.constants';
import { PermissionContextLoader } from '../authorization';
import { SecurityEventLogger } from '../../core/logger/security-event-logger.contract';
import {
  IDENTITY_KEYS as K,
  IDENTITY_TTL as T,
  SECURITY_EVENT as E,
} from '../../shared/identity.constants';
import type {
  SessionClaims,
  SessionTokens,
  RequestMetadata,
  RefreshRecord,
} from '../../shared/identity.types';
export const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');
@Injectable()
export class DefaultSessionService
  extends SessionService
  implements SessionVerifier, SessionRevoker
{
  public constructor(
    @Inject(AuthRepository) private readonly repository: AuthRepository,
    @Inject(TokenSigner) private readonly signer: TokenSigner,
    @Inject(KeyValueStore) private readonly store: KeyValueStore,
    @Inject(TransactionRunner) private readonly tx: TransactionRunner,
    @Inject(IdGenerator) private readonly ids: IdGenerator,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(PermissionContextLoader) private readonly context: PermissionContextLoader,
    @Inject(SecurityEventLogger) private readonly events: SecurityEventLogger,
  ) {
    super();
  }
  private async tokens(
    org: string,
    user: string,
    family: string,
    metadata: RequestMetadata,
  ): Promise<{ tokens: SessionTokens; record: RefreshRecord }> {
    const id = this.ids.next();
    const claims = { sub: user, org, fid: family };
    const [access, refresh] = await Promise.all([
      this.signer.sign(claims, false),
      this.signer.sign({ ...claims, jti: id }, true),
    ]);
    return {
      tokens: { access, refresh },
      record: {
        id,
        organizationId: org,
        userId: user,
        familyId: family,
        tokenHash: sha256(refresh),
        expiresAt: new Date(this.clock.now().getTime() + T.REFRESH),
        ip: metadata.ip,
        userAgent: metadata.userAgent,
        revokedAt: null,
        replacedById: null,
      },
    };
  }
  public override async create(
    org: string,
    user: string,
    metadata: RequestMetadata,
    family = this.ids.next(),
  ): Promise<SessionTokens> {
    const created = await this.tokens(org, user, family, metadata);
    await this.repository.createRefresh(created.record);
    return created.tokens;
  }
  public async verify(access: string): Promise<SessionClaims> {
    const claims = await this.signer.verify(access, false);
    await this.checkMarkers(claims);
    return claims;
  }
  private async checkMarkers(claims: SessionClaims): Promise<void> {
    const [family, user] = await Promise.all([
      this.store.get(K.family(claims.fid)),
      this.store.get(K.user(claims.sub)),
    ]);
    if (family) throw new AppException(ErrorCode.SESSION_REVOKED);
    if (user) {
      const marker = JSON.parse(user) as { at: number; exceptFamily?: string };
      if (claims.fid !== marker.exceptFamily && claims.iat * T.MILLISECONDS <= marker.at)
        throw new AppException(ErrorCode.SESSION_REVOKED);
    }
  }
  public override async refresh(token: string, metadata: RequestMetadata): Promise<SessionTokens> {
    const claims = await this.signer.verify(token, true);
    await this.checkMarkers(claims);
    await this.context.load(claims.org, claims.sub);
    const candidate = await this.tokens(claims.org, claims.sub, claims.fid, metadata);
    const now = this.clock.now();
    const result = await this.tx.run(async () => {
      const old = await this.repository.refresh(claims.org, claims.sub, claims.jti ?? '');
      if (!validRefresh(old, token, claims, now)) return ErrorCode.SESSION_REVOKED;
      if (await this.repository.rotate(claims.org, claims.sub, old.id, candidate.record, now))
        return undefined;
      const current = await this.repository.refresh(claims.org, claims.sub, old.id);
      if (inRotationGrace(current, now)) return ErrorCode.TOKEN_ROTATED;
      await this.repository.revokeFamily(claims.org, claims.sub, claims.fid, now);
      return ErrorCode.SESSION_REVOKED;
    });
    if (result === ErrorCode.SESSION_REVOKED) {
      await this.markFamily(claims);
      this.events.record(E.REUSE, {
        userId: claims.sub,
        organizationId: claims.org,
        familyId: claims.fid,
      });
    }
    if (result) throw new AppException(result);
    return candidate.tokens;
  }
  public override async logout(token: string): Promise<void> {
    const claims = await this.signer.verify(token, true);
    await this.revokeFamily(claims);
  }
  public override async revokeFamily(claims: SessionClaims): Promise<void> {
    await this.repository.revokeFamily(claims.org, claims.sub, claims.fid, this.clock.now());
    await this.markFamily(claims);
  }
  private async markFamily(claims: SessionClaims): Promise<void> {
    await this.store.set(K.family(claims.fid), 'revoked', T.ACCESS);
    this.events.record(E.REVOKED, {
      userId: claims.sub,
      organizationId: claims.org,
      familyId: claims.fid,
    });
  }
  public async revokeUser(org: string, user: string, exceptFamily?: string): Promise<void> {
    const time = this.clock.now();
    const families = await this.repository.revokeUser(org, user, time, exceptFamily);
    await this.tx.afterCommit(async () => {
      await Promise.all(
        families.map((family) => this.store.set(K.family(family), 'revoked', T.ACCESS)),
      );
      await this.store.set(
        K.user(user),
        JSON.stringify({ at: time.getTime(), ...(exceptFamily ? { exceptFamily } : {}) }),
        T.ACCESS,
      );
      await this.context.invalidate(org, user);
      this.events.record(E.REVOKED, { userId: user, organizationId: org });
    });
  }
}

function validRefresh(
  old: RefreshRecord | null,
  token: string,
  claims: SessionClaims,
  now: Date,
): old is RefreshRecord {
  return (
    !!old && old.tokenHash === sha256(token) && old.familyId === claims.fid && old.expiresAt > now
  );
}
function inRotationGrace(current: RefreshRecord | null, now: Date): boolean {
  return (
    !!current?.replacedById &&
    !!current.revokedAt &&
    now.getTime() - current.revokedAt.getTime() <= T.GRACE
  );
}
