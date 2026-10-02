import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { IsNull } from 'typeorm';
import { ErrorCode } from '../../../core/errors/error-codes';
import { AppException } from '../../../core/errors/app.exception';
import { RefreshToken } from '../entities/refresh-token.entity';
import { TokenService } from '../services/token.service';
import { AppConfigService } from '../../../core/config/app-config.service';

describe('TokenService', () => {
  let tokens: TokenService;
  let jwt: JwtService;
  let store: MemoryTokens;

  beforeEach(async () => {
    store = new MemoryTokens();
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({})],
      providers: [
        {
          provide: TokenService,
          inject: [JwtService],
          useFactory: (jwtService: JwtService) =>
            new TokenService(
              store.asRepository(),
              { run: (fn: any) => fn() } as any,
              jwtService,
              config(),
            ),
        },
      ],
    }).compile();

    tokens = moduleRef.get(TokenService);
    jwt = moduleRef.get(JwtService);
  });

  it('rotates a refresh token and rejects reuse of the old one', async () => {
    const issued = await tokens.issue(sessionInput());
    const rotated = await tokens.rotate(issued.refreshToken, {
      userAgent: 'next',
      ip: '127.0.0.1',
    });

    expect(rotated.refreshToken).not.toBe(issued.refreshToken);
    await expect(tokens.verifyAccess(rotated.accessToken)).resolves.toMatchObject({
      sub: 'user-1',
      org: 'org-1',
      fid: issued.familyId,
    });

    await expect(tokens.verifyRefresh(issued.refreshToken)).rejects.toMatchObject({
      response: { code: ErrorCode.SESSION_REVOKED },
    });
    await expect(tokens.verifyRefresh(rotated.refreshToken)).rejects.toMatchObject({
      response: { code: ErrorCode.SESSION_REVOKED },
    });
  });

  it('rejects an expired access token', async () => {
    const expired = await jwt.signAsync(
      { sub: 'user-1', org: 'org-1', fid: 'family-1' },
      { secret: 'test-access-secret-value', expiresIn: -1 },
    );

    await expect(tokens.verifyAccess(expired)).rejects.toBeInstanceOf(AppException);
    await expect(tokens.verifyAccess(expired)).rejects.toMatchObject({
      response: { code: ErrorCode.TOKEN_EXPIRED },
    });
  });
});

function sessionInput() {
  return {
    userId: 'user-1',
    organizationId: 'org-1',
    meta: { userAgent: 'jest', ip: '127.0.0.1' },
  };
}

function config(): AppConfigService {
  return {
    jwtAccessSecret: 'test-access-secret-value',
    jwtRefreshSecret: 'test-refresh-secret-value',
    jwtAccessTtl: '15m',
    jwtRefreshTtl: '7d',
  } as AppConfigService;
}

class MemoryTokens {
  rows: RefreshToken[] = [];

  asRepository(): never {
    return this as never;
  }

  async findByJti(jti: string): Promise<RefreshToken | null> {
    return this.rows.find((r) => r.id === jti && !r.deletedAt) ?? null;
  }

  async saveToken(
    token: Partial<RefreshToken> & { organizationId: string },
  ): Promise<RefreshToken> {
    const entity = {
      ...token,
      id: token.id ?? 'token-id',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      revokedAt: token.revokedAt ?? null,
      replacedById: token.replacedById ?? null,
      userAgent: token.userAgent ?? null,
      ip: token.ip ?? null,
    } as RefreshToken;
    this.rows.push(entity);
    return entity;
  }

  async revokeFamily(organizationId: string, familyId: string): Promise<void> {
    for (const r of this.rows) {
      if (r.familyId === familyId && r.organizationId === organizationId && !r.revokedAt) {
        r.revokedAt = new Date();
      }
    }
  }

  async revokeAllForUser(organizationId: string, userId: string): Promise<void> {
    for (const r of this.rows) {
      if (r.userId === userId && r.organizationId === organizationId && !r.revokedAt) {
        r.revokedAt = new Date();
      }
    }
  }

  async updateToken(token: RefreshToken): Promise<RefreshToken> {
    const idx = this.rows.findIndex((r) => r.id === token.id);
    if (idx >= 0) {
      this.rows[idx] = token;
    } else {
      this.rows.push(token);
    }
    return token;
  }
}

void IsNull;
