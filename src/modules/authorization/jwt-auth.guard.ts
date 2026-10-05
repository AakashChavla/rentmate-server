import { Inject, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SessionVerifier } from '../auth';
import { PermissionContextLoader, PermissionChecker } from './permission.contract';
import { AUTHENTICATED_METADATA, PERMISSIONS_METADATA } from './permission.decorators';
import { HTTP_METADATA } from '../../core/http/http.decorators';
import { COOKIE_NAMES } from '../../core/config/config.constants';
import { RequestContext } from '../../core/context/request-context';
import { AppException } from '../../core/errors/app-exception';
import { ErrorCode } from '../../core/errors/error-code.constants';
import type { AuthenticatedRequest } from './auth-request';
@Injectable()
export class JwtAuthGuard implements CanActivate {
  public constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(SessionVerifier) private readonly sessions: SessionVerifier,
    @Inject(PermissionContextLoader) private readonly context: PermissionContextLoader,
    @Inject(PermissionChecker) private readonly permissions: PermissionChecker,
    @Inject(RequestContext) private readonly requests: RequestContext,
  ) {}
  public async canActivate(execution: ExecutionContext): Promise<boolean> {
    const targets = [execution.getHandler(), execution.getClass()];
    if (this.reflector.getAllAndOverride<boolean | undefined>(HTTP_METADATA.PUBLIC, targets))
      return true;
    const required = this.reflector.getAllAndOverride<string[] | undefined>(
      PERMISSIONS_METADATA,
      targets,
    );
    const authenticated = this.reflector.getAllAndOverride<boolean>(
      AUTHENTICATED_METADATA,
      targets,
    );
    if (!required && !authenticated) throw new AppException(ErrorCode.FORBIDDEN);
    const request = execution.switchToHttp().getRequest<AuthenticatedRequest>();
    const cookies = request.cookies as Record<string, string> | undefined;
    const token = cookies?.[COOKIE_NAMES.ACCESS];
    if (!token) throw new AppException(ErrorCode.UNAUTHORIZED);
    const session = await this.sessions.verify(token);
    const context = await this.context.load(session.org, session.sub);
    if (required?.some((permission) => !this.permissions.can(context, permission)))
      throw new AppException(ErrorCode.FORBIDDEN);
    request.session = session;
    request.authContext = context;
    Object.assign(request, { user: context.user, organization: context.organization });
    const identity = this.requests.current();
    if (identity) {
      identity.userId = session.sub;
      identity.organizationId = session.org;
    }
    return true;
  }
}
