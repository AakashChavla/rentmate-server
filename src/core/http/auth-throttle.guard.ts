import { Injectable, Inject, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { KeyValueStore } from '../redis/key-value-store.contract';
import { IDENTITY_LIMITS as L, IDENTITY_TTL as T } from '../../shared/identity.constants';
import { AppException } from '../errors/app-exception';
import { ErrorCode } from '../errors/error-code.constants';
import { createHash } from 'node:crypto';
const SESSION_ENDPOINTS = ['/api/v1/auth/me', '/api/v1/auth/refresh', '/api/v1/auth/logout'];
@Injectable()
export class AuthThrottleGuard implements CanActivate {
  public constructor(@Inject(KeyValueStore) private readonly store: KeyValueStore) {}
  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const endpoint = request.path;
    const limit = SESSION_ENDPOINTS.includes(endpoint) ? L.SESSION_THROTTLE : L.STRICT_THROTTLE;
    const ip = request.ip ?? '';
    const body = request.body as { email?: unknown; token?: unknown } | undefined;
    const email =
      typeof body?.email === 'string'
        ? sha256(body.email.toLowerCase())
        : typeof body?.token === 'string'
          ? sha256(body.token)
          : '';
    const window = Math.floor(Date.now() / T.RESEND);
    const key = `auth:throttle:${endpoint}:${ip}:${String(window)}`;
    const counts = await Promise.all([
      this.store.incrementWindow(key, T.RESEND),
      ...(email
        ? [
            this.store.incrementWindow(
              `auth:throttle:${endpoint}:email:${email}:${String(window)}`,
              T.RESEND,
            ),
          ]
        : []),
    ]);
    if (counts.some((count) => count > limit))
      throw new AppException(ErrorCode.RATE_LIMITED, {
        retryAfterSeconds: Math.ceil((T.RESEND - (Date.now() % T.RESEND)) / T.MILLISECONDS),
      });
    return true;
  }
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
