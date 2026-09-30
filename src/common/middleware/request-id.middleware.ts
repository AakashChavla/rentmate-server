import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { TenantContext } from '../base/tenant-context';
import { resolveRequestId } from '../utils/request-id';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const existing = typeof req.id === 'string' && req.id.length > 0 ? req.id : undefined;
    const requestId = existing ?? resolveRequestId(req.header('x-request-id'));
    req.id = requestId;
    req.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);
    TenantContext.run({ requestId }, () => next());
  }
}
