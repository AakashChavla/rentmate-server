import { Module } from '@nestjs/common';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { LoggerModule } from 'nestjs-pino';
import { I18nModule } from 'nestjs-i18n';
import { CoreModule } from './core/core.module';
import { DEFAULT_LOCALE } from './shared/locale.constants';
import { RequestLocaleResolver } from './core/i18n/request-locale.resolver';
import { AppConfig } from './core/config/app-config.contract';
import { REDACTED_FIELDS, HTTP_HEADERS } from './core/config/config.constants';
import { HealthController } from './core/health/health.controller';
import { HealthService } from './core/health/health.contract';
import { DefaultHealthService } from './core/health/default-health.service';
@Module({
  imports: [
    CoreModule,
    I18nModule.forRoot({
      fallbackLanguage: DEFAULT_LOCALE,
      loaderOptions: { path: join(__dirname, 'i18n'), watch: false },
      resolvers: [RequestLocaleResolver],
    }),
    LoggerModule.forRootAsync({
      imports: [CoreModule],
      inject: [AppConfig],
      useFactory: (config: AppConfig) => ({
        pinoHttp: {
          level: config.get('LOG_LEVEL'),
          redact: REDACTED_FIELDS,
          genReqId: (_request, response) => {
            const id = randomUUID();
            response.setHeader(HTTP_HEADERS.REQUEST_ID, id);
            return id;
          },
          serializers: {
            req: (request: { id: string; method: string; url: string }) => ({
              id: request.id,
              method: request.method,
              url: request.url.split('?')[0],
            }),
          },
        },
      }),
    }),
  ],
  controllers: [HealthController],
  providers: [{ provide: HealthService, useClass: DefaultHealthService }],
})
export class AppModule {}
