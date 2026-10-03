import type { Options } from 'pino-http';
import { AppConfig } from '../config/app-config.contract';
import { RequestContext } from '../context/request-context';
import { LOG_STATUS, REDACTED_FIELDS } from '../config/config.constants';
export function loggerOptions(config: AppConfig, context: RequestContext): Options {
  return {
    level: config.get('LOG_LEVEL'),
    redact: REDACTED_FIELDS,
    genReqId: (request) => request.id,
    mixin: () => ({
      requestId: context.current()?.requestId ?? null,
      userId: context.current()?.userId ?? null,
      organizationId: context.current()?.organizationId ?? null,
    }),
    customLogLevel: (_req, res) => (res.statusCode >= LOG_STATUS.SERVER_ERROR ? 'error' : 'info'),
    serializers: {
      err: (error: { name?: string }) => ({ type: error.name }),
      req: (req: { id: string; method: string; url: string }) => ({
        id: req.id,
        method: req.method,
        url: req.url.split('?')[0],
      }),
    },
  };
}
