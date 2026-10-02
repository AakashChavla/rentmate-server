import { ErrorCode } from '../../../core/errors/error-codes';
import { AppConfigService } from '../../../core/config/app-config.service';
import { OtpVerification } from '../entities/otp-verification.entity';
import { OtpPurpose } from '../types/otp-purpose';
import { OtpService } from '../services/otp.service';
import { sha256 } from '../../../shared/hashing';
import { User } from '../../users/entities/user.entity';
import type { UserRepository } from '../../users/repositories/user.repository';
import { UserStatus } from '../../users/types/user-status';

describe('OtpService', () => {
  const users = new Map<string, User>();
  const rows: OtpVerification[] = [];
  const jobs: { data: { to?: string; code?: string } }[] = [];
  let redis: MemoryRedis;
  let otp: OtpService;

  beforeEach(() => {
    users.clear();
    rows.length = 0;
    jobs.length = 0;
    redis = new MemoryRedis();
    const notificationService = {
      sendEmail: async (to: string, _template: string, data: { code: string }) => {
        jobs.push({ data: { to, code: data?.code } });
      },
    };
    otp = new OtpService(
      memoryRepository(rows) as never,
      {
        findByEmailForAuth: async (email: string) => users.get(email) ?? null,
      } as unknown as UserRepository,
      redis as never,
      notificationService as never,
      { authDevLogOtp: false } as AppConfigService,
    );
  });

  it('returns the same body when the email is unknown', async () => {
    users.set('known@rentmate.local', user('known@rentmate.local'));

    await expect(otp.send('missing@rentmate.local', OtpPurpose.Login)).resolves.toEqual({
      accepted: true,
    });
    await expect(otp.send('known@rentmate.local', OtpPurpose.Login)).resolves.toEqual({
      accepted: true,
    });
    expect(jobs).toHaveLength(1);
  });

  it('rejects an expired code and stops after three attempts', async () => {
    users.set('known@rentmate.local', user('known@rentmate.local'));
    await otp.send('known@rentmate.local', OtpPurpose.Login);
    const code = jobs[0]?.data.code ?? '';
    rows[0]!.expiresAt = new Date('2000-01-01T00:00:00.000Z');

    await expect(otp.verify('known@rentmate.local', code, OtpPurpose.Login)).rejects.toMatchObject({
      response: { code: ErrorCode.OTP_EXPIRED },
    });

    redis.values.clear();
    rows.length = 0;
    jobs.length = 0;
    await otp.send('known@rentmate.local', OtpPurpose.Login);
    await expect(
      otp.verify('known@rentmate.local', '000000', OtpPurpose.Login),
    ).rejects.toMatchObject({
      response: { code: ErrorCode.OTP_INVALID },
    });
    await expect(
      otp.verify('known@rentmate.local', '000000', OtpPurpose.Login),
    ).rejects.toMatchObject({
      response: { code: ErrorCode.OTP_INVALID },
    });
    await expect(
      otp.verify('known@rentmate.local', '000000', OtpPurpose.Login),
    ).rejects.toMatchObject({
      response: { code: ErrorCode.OTP_INVALID },
    });
    expect(rows[0]?.consumedAt).toBeInstanceOf(Date);
  });

  it('locks verification after five failures in the window', async () => {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await expect(
        otp.verify('missing@rentmate.local', '111111', OtpPurpose.Login),
      ).rejects.toMatchObject({
        response: { code: ErrorCode.OTP_INVALID },
      });
    }

    await expect(
      otp.verify('missing@rentmate.local', '111111', OtpPurpose.Login),
    ).rejects.toMatchObject({
      response: { code: ErrorCode.OTP_LOCKED, details: { retryAfterSeconds: 600 } },
    });
  });

  it('does not reveal a stored code hash', async () => {
    users.set('known@rentmate.local', user('known@rentmate.local'));
    await otp.send('known@rentmate.local', OtpPurpose.Login);
    expect(rows[0]?.codeHash).toBe(sha256(jobs[0]?.data.code ?? ''));
    expect(rows[0]?.codeHash).not.toBe(jobs[0]?.data.code);
  });
});

function user(email: string): User {
  return {
    id: 'user-1',
    organizationId: 'org-1',
    email,
    passwordHash: null,
    fullName: 'Known User',
    phone: null,
    status: UserStatus.Active,
    emailVerifiedAt: null,
    lastLoginAt: null,
    failedLoginCount: 0,
    lockedUntil: null,
    isPlatformAdmin: false,
    notificationPreferences: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };
}

function memoryRepository(rows: OtpVerification[]) {
  return {
    findLatestActive: async (organizationId: string, userId: string, purpose: string) => {
      const active = rows
        .filter(
          (r) =>
            r.organizationId === organizationId &&
            r.userId === userId &&
            (r.purpose as string) === purpose &&
            r.consumedAt == null &&
            !r.deletedAt,
        )
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return active[0] ?? null;
    },
    saveOtp: async (otp: Partial<OtpVerification> & { organizationId: string }) => {
      const stored = {
        ...otp,
        id: otp.id ?? `otp-${rows.length + 1}`,
        createdAt: otp.createdAt ?? new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as OtpVerification;
      rows.push(stored);
      return stored;
    },
    updateOtp: async (otp: OtpVerification) => {
      const index = rows.findIndex((r) => r.id === otp.id);
      if (index >= 0) {
        rows[index] = otp;
      } else {
        rows.push(otp);
      }
      return otp;
    },
    consumeOtp: async (organizationId: string, id: string) => {
      const found = rows.find((r) => r.id === id && r.organizationId === organizationId);
      if (found) {
        found.consumedAt = new Date();
      }
    },
  };
}

class MemoryRedis {
  values = new Map<string, { value: string; expiresAt: number | null }>();

  async get(key: string): Promise<string | null> {
    return this.current(key)?.value ?? null;
  }

  async set(key: string, value: string, ...args: Array<string | number>): Promise<'OK' | null> {
    const exists = this.current(key);
    if (args.includes('NX') && exists) {
      return null;
    }

    const expiryIndex = args.indexOf('EX');
    const seconds = expiryIndex >= 0 ? Number(args[expiryIndex + 1]) : null;
    this.values.set(key, {
      value,
      expiresAt: seconds ? Date.now() + seconds * 1000 : null,
    });
    return 'OK';
  }

  async incr(key: string): Promise<number> {
    const current = Number(this.current(key)?.value ?? '0') + 1;
    const existing = this.values.get(key);
    this.values.set(key, { value: String(current), expiresAt: existing?.expiresAt ?? null });
    return current;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const current = this.values.get(key);
    if (!current) {
      return 0;
    }

    current.expiresAt = Date.now() + seconds * 1000;
    return 1;
  }

  async ttl(key: string): Promise<number> {
    const current = this.current(key);
    if (!current?.expiresAt) {
      return -1;
    }

    return Math.ceil((current.expiresAt - Date.now()) / 1000);
  }

  async del(key: string): Promise<number> {
    return this.values.delete(key) ? 1 : 0;
  }

  private current(key: string): { value: string; expiresAt: number | null } | undefined {
    const entry = this.values.get(key);
    if (!entry) {
      return undefined;
    }

    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      this.values.delete(key);
      return undefined;
    }

    return entry;
  }
}
