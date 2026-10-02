import { DynamicModule, Module, RequestMethod } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { LoggerModule, type Params } from 'nestjs-pino';
import type { Options } from 'pino-http';
import { AppConfigModule } from '../config/config.module';
import { AppConfigService } from '../config/app-config.service';
import { TenantContext } from '../../core/tenancy/tenant-context';
import { resolveRequestId } from '../../shared/request-id';

@Module({})
export class AppLoggerModule {
  static forRoot(): DynamicModule {
    return {
      module: AppLoggerModule,
      imports: [
        LoggerModule.forRootAsync({
          imports: [AppConfigModule],
          inject: [AppConfigService],
          useFactory: (config: AppConfigService): Params => createLoggerParams(config),
        }),
      ],
      exports: [LoggerModule],
    };
  }
}

function createLoggerParams(config: AppConfigService): Params {
  const pinoHttp: Options = {
    level: config.nodeEnv === 'development' ? 'debug' : 'info',
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers["set-cookie"]',
        'req.body.password',
        'req.body.currentPassword',
        'req.body.newPassword',
        'req.body.code',
      ],
      remove: true,
    },
    autoLogging: {
      ignore: (req) => (req.url ?? '').split('?')[0]?.startsWith('/health') ?? false,
    },
    genReqId: (req: IncomingMessage, res: ServerResponse) => {
      const current = typeof req.id === 'string' && req.id.length > 0 ? req.id : undefined;
      const requestId = current ?? resolveRequestId(req.headers['x-request-id']);
      res.setHeader('X-Request-ID', requestId);
      return requestId;
    },
    customProps: (req) => {
      const requestId = typeof req.id === 'string' ? req.id : undefined;
      const userId = TenantContext.getUserId();
      const organizationId = TenantContext.getOrganizationId();
      return {
        ...(requestId ? { requestId } : {}),
        ...(userId ? { userId } : {}),
        ...(organizationId ? { organizationId } : {}),
      };
    },
  };

  if (config.nodeEnv === 'development') {
    pinoHttp.transport = {
      target: 'pino-pretty',
      options: {
        singleLine: true,
        colorize: true,
        translateTime: 'SYS:standard',
      },
    };
  }

  return {
    pinoHttp,
    assignResponse: true,
    forRoutes: [{ path: '{*path}', method: RequestMethod.ALL }],
  };
}
