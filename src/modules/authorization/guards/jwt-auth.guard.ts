import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Inject,
  Injectable,
  forwardRef,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { TenantContext } from '../../../core/tenancy/tenant-context';
import { ErrorCode } from '../../../core/errors/error-codes';
import { ALLOW_REFRESH_KEY } from '../../../core/http/decorators/allow-refresh.decorator';
import type { AuthenticatedUser } from '../../../core/http/decorators/current-user.decorator';
import { IS_PUBLIC_KEY } from '../../../core/http/decorators/public.decorator';
import { AppException } from '../../../core/errors/app.exception';
import { CookieName } from '../../../shared/auth-cookies';
import { TokenService } from '../../auth/services/token.service';
import type { AccessTokenClaims } from '../../auth/types/token.types';
import { UserStatus } from '../../users/entities/user.entity';
import { PermissionService } from '../services/permission.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(forwardRef(() => TokenService))
    private readonly tokens: TokenService,
    private readonly permissions: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const allowRefresh = this.reflector.getAllAndOverride<boolean>(ALLOW_REFRESH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const claims = await this.resolveClaims(request, Boolean(allowRefresh));
    const profile = await this.permissions.getProfile(claims.sub, claims.org);
    if (!profile) {
      throw unauthorized();
    }

    if (profile.user.status === UserStatus.Suspended) {
      throw new AppException(
        ErrorCode.ACCOUNT_SUSPENDED,
        'Account suspended',
        HttpStatus.FORBIDDEN,
      );
    }

    const user: AuthenticatedUser = {
      id: profile.user.id,
      organizationId: profile.user.organizationId,
      sessionId: claims.fid,
      status: profile.user.status,
      isPlatformAdmin: profile.isPlatformAdmin,
      grants: profile.grants,
    };
    (request as any).user = user;
    TenantContext.setVerifiedIdentity({
      userId: user.id,
      organizationId: user.organizationId,
    });
    return true;
  }

  private async resolveClaims(request: Request, allowRefresh: boolean): Promise<AccessTokenClaims> {
    const access = readCookie(request, CookieName.Access);
    if (access) {
      try {
        return await this.tokens.verifyAccess(access);
      } catch (error) {
        if (!allowRefresh || !isExpired(error)) {
          throw error;
        }
      }
    }

    if (!allowRefresh) {
      throw unauthorized();
    }

    const refresh = readCookie(request, CookieName.Refresh);
    if (!refresh) {
      throw unauthorized();
    }

    return this.tokens.verifyRefresh(refresh);
  }
}

function readCookie(request: Request, name: string): string | undefined {
  const value = request.cookies?.[name] as unknown;
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function unauthorized(): AppException {
  return new AppException(
    ErrorCode.UNAUTHORIZED,
    'Authentication required',
    HttpStatus.UNAUTHORIZED,
  );
}

function isExpired(error: unknown): boolean {
  return (
    error instanceof AppException &&
    typeof error.getResponse() === 'object' &&
    error.getResponse() !== null &&
    (error.getResponse() as { code?: string }).code === ErrorCode.TOKEN_EXPIRED
  );
}
