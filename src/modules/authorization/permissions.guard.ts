import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ErrorCode } from '../../common/constants/error-codes';
import { PERMISSIONS_KEY } from '../../common/decorators/require-permissions.decorator';
import { AppException } from '../../common/exceptions/app.exception';
import { PermissionService } from './permission.service';

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
    const user = request.user;
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
