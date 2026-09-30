import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Identity attached by the future JWT guard. The organization id on this
 * object comes from the verified token, not from route params or the body.
 */
export interface AuthenticatedUser {
  id: string;
  organizationId: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user || !data) {
      return user;
    }

    return user[data];
  },
);
