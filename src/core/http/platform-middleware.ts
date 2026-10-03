import { Clock } from '../time/clock.contract';
import type { Request, Response, NextFunction } from 'express';
import { HttpStatus } from '@nestjs/common';
import { RequestContext } from '../context/request-context';
import { IdGenerator } from '../ids/id-generator.contract';
import { AppConfig } from '../config/app-config.contract';
import { KeyValueStore } from '../redis/key-value-store.contract';
import { AppException } from '../errors/app-exception';
import { ErrorCode } from '../errors/error-code.constants';
import {
  CACHE_KEYS,
  COOKIE_NAMES,
  HEADER_NAMES,
  HTTP_METHODS,
  VALID_REQUEST_ID,
} from '../config/config.constants';
export function requestIdentity(
  context: RequestContext,
  ids: IdGenerator,
): (req: Request, res: Response, next: NextFunction) => void {
  return (request, response, next) => {
    const incoming = request.get(HEADER_NAMES.REQUEST_ID);
    const requestId = incoming && VALID_REQUEST_ID.test(incoming) ? incoming : ids.next();
    request.id = requestId;
    response.setHeader(HEADER_NAMES.REQUEST_ID, requestId);
    context.run({ requestId }, next);
  };
}
export function originCheck(
  config: AppConfig,
): (req: Request, res: Response, next: NextFunction) => void {
  return (request, _response, next) => {
    const cookies = request.cookies as Record<string, string> | undefined;
    const authenticated =
      cookies &&
      [COOKIE_NAMES.ACCESS, COOKIE_NAMES.REFRESH, COOKIE_NAMES.SESSION].some((key) => cookies[key]);
    if (
      !HTTP_METHODS.SAFE.includes(request.method as (typeof HTTP_METHODS.SAFE)[number]) &&
      authenticated &&
      !config.get('CORS_ORIGIN').includes(request.get(HEADER_NAMES.ORIGIN) ?? '')
    ) {
      next(new AppException(ErrorCode.CSRF_ORIGIN_MISMATCH));
      return;
    }
    next();
  };
}
export function atomicThrottle(
  config: AppConfig,
  store: KeyValueStore,
  clock: Clock,
): (req: Request, res: Response, next: NextFunction) => void {
  return (request, response, next) => {
    const windowMs = config.get('THROTTLE_WINDOW_MS');
    const key = CACHE_KEYS.throttle(
      request.ip ?? request.socket.remoteAddress ?? '',
      Math.floor(clock.now().getTime() / windowMs),
    );
    void store
      .incrementWindow(key, windowMs)
      .then((count) => {
        if (count > config.get('THROTTLE_LIMIT')) {
          response.setHeader(HEADER_NAMES.RETRY_AFTER, Math.ceil(windowMs / MILLISECONDS));
          next(new AppException(ErrorCode.RATE_LIMITED));
          return;
        }
        next();
      })
      .catch(() => {
        next(new AppException(ErrorCode.INFRASTRUCTURE_UNAVAILABLE));
      });
  };
}
const MILLISECONDS = 1000;
export const THROTTLE_STATUS = HttpStatus.TOO_MANY_REQUESTS;
