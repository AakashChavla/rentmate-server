import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { RequestMethod, type INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { AppConfig } from './core/config/app-config.contract';
import { RequestContext } from './core/context/request-context';
import { IdGenerator } from './core/ids/id-generator.contract';
import { KeyValueStore } from './core/redis/key-value-store.contract';
import { ROUTES, HEADER_NAMES } from './core/config/config.constants';
import { requestIdentity, originCheck, atomicThrottle } from './core/http/platform-middleware';
import { AllExceptionsFilter } from './core/http/all-exceptions.filter';
import { ResponseEnvelopeInterceptor } from './core/http/response-envelope.interceptor';
import { Reflector } from '@nestjs/core';
import { Clock } from './core/time/clock.contract';
import { I18nService } from 'nestjs-i18n';
import { applicationValidationPipe } from './core/http/validation';
import { setupSwagger } from './core/http/swagger';
export function configureApplication(app: INestApplication): void {
  const express = app as NestExpressApplication;
  const config = app.get(AppConfig);
  express.set('trust proxy', config.get('TRUST_PROXY'));
  app.use(requestIdentity(app.get(RequestContext), app.get(IdGenerator)));
  app.useLogger(app.get(Logger));
  app.use(helmet(), compression(), cookieParser());
  app.enableCors({
    origin: config.get('CORS_ORIGIN'),
    credentials: true,
    exposedHeaders: [HEADER_NAMES.REQUEST_ID],
  });
  app.use(originCheck(config), atomicThrottle(config, app.get(KeyValueStore), app.get(Clock)));
  app.setGlobalPrefix(ROUTES.PREFIX, {
    exclude: [
      { path: ROUTES.LIVE, method: RequestMethod.GET },
      { path: ROUTES.READY, method: RequestMethod.GET },
    ],
  });
  app.useGlobalPipes(applicationValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter(app.get(I18nService), app.get(RequestContext)));
  app.useGlobalInterceptors(
    new ResponseEnvelopeInterceptor(app.get(Reflector), app.get(Clock), app.get(RequestContext)),
  );
  if (config.get('SWAGGER_ENABLED')) setupSwagger(app);
  app.enableShutdownHooks();
}
export async function createApplication(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  configureApplication(app);
  return app;
}
