import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { FindOperator, IsNull } from 'typeorm';
import { ErrorCode } from '../../../../src/common/constants/error-codes';
import { AppException } from '../../../../src/common/exceptions/app.exception';
import { RefreshToken } from '../../../../src/modules/auth/entities/refresh-token.entity';
import { TokenService } from '../../../../src/modules/auth/token.service';
import { AppConfigService } from '../../../../src/config/app-config.service';

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
            new TokenService(store.asRepository(), jwtService, config()),
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

  create(entity: Partial<RefreshToken>): RefreshToken {
    return entity as RefreshToken;
  }

  async save(entity: RefreshToken): Promise<RefreshToken> {
    const stored = {
      ...entity,
      createdAt: entity.createdAt ?? new Date(),
      updatedAt: new Date(),
      deletedAt: entity.deletedAt ?? null,
    };
    const index = this.rows.findIndex((row) => row.id === stored.id);
    if (index >= 0) {
      this.rows[index] = stored;
    } else {
      this.rows.push(stored);
    }

    return stored;
  }

  async findOne(options: { where?: Record<string, unknown> }): Promise<RefreshToken | null> {
    return this.rows.find((row) => !row.deletedAt && matches(row, options.where)) ?? null;
  }

  async find(options: { where?: Record<string, unknown> }): Promise<RefreshToken[]> {
    return this.rows.filter((row) => !row.deletedAt && matches(row, options.where));
  }

  async update(
    where: Record<string, unknown>,
    partial: Partial<RefreshToken>,
  ): Promise<{ affected: number }> {
    let affected = 0;
    for (const row of this.rows) {
      if (!row.deletedAt && matches(row, where)) {
        Object.assign(row, partial);
        affected += 1;
      }
    }

    return { affected };
  }
}

function matches(row: RefreshToken, where: Record<string, unknown> | undefined): boolean {
  if (!where) {
    return true;
  }

  return Object.entries(where).every(([key, expected]) => {
    const actual = row[key as keyof RefreshToken];
    if (expected instanceof FindOperator) {
      return expected.type === 'isNull' ? actual == null : false;
    }

    return actual === expected;
  });
}

void IsNull;
