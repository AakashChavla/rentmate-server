import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ErrorCode } from '../../../core/errors/error-codes';
import { PERMISSIONS_KEY } from '../../../core/http/decorators/require-permissions.decorator';
import { AppException } from '../../../core/errors/app.exception';
import { PermissionService } from '../services/permission.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissions: PermissionService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;
    if (!user) {
      throw new AppException(
        ErrorCode.UNAUTHORIZED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const allowed = required.every((permission) => this.permissions.holds(user, permission));
    if (!allowed) {
      throw new AppException(ErrorCode.FORBIDDEN, 'Missing permission', HttpStatus.FORBIDDEN);
    }

    return true;
  }
}
