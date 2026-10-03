import { Module } from '@nestjs/common';
import { join } from 'node:path';
import { LoggerModule } from 'nestjs-pino';
import { I18nModule } from 'nestjs-i18n';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CoreModule } from './core/core.module';
import { DEFAULT_LOCALE } from './shared/locale.constants';
import { RequestLocaleResolver } from './core/i18n/request-locale.resolver';
import { AppConfig } from './core/config/app-config.contract';
import { RequestContext } from './core/context/request-context';
import { loggerOptions } from './core/logger/logger-options';
import { HealthController } from './core/health/health.controller';
import { HealthService } from './core/health/health.contract';
import { DefaultHealthService } from './core/health/default-health.service';
import { Readiness } from './core/health/readiness.contract';
import { DefaultReadiness } from './core/health/default-readiness.service';
@Module({
  imports: [
    EventEmitterModule.forRoot(),
    CoreModule,
    I18nModule.forRoot({
      fallbackLanguage: DEFAULT_LOCALE,
      loaderOptions: { path: join(__dirname, 'i18n'), watch: false },
      resolvers: [RequestLocaleResolver],
    }),
    LoggerModule.forRootAsync({
      imports: [CoreModule],
      inject: [AppConfig, RequestContext],
      useFactory: (config: AppConfig, context: RequestContext) => ({
        pinoHttp: loggerOptions(config, context),
      }),
    }),
  ],
  controllers: [HealthController],
  providers: [
    { provide: HealthService, useClass: DefaultHealthService },
    { provide: Readiness, useClass: DefaultReadiness },
  ],
})
export class AppModule {}
