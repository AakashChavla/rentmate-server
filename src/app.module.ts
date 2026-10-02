import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AllExceptionsFilter } from './core/http/filters/all-exceptions.filter';
import { LoggingInterceptor } from './core/http/interceptors/logging.interceptor';
import { ResponseEnvelopeInterceptor } from './core/http/interceptors/response-envelope.interceptor';
import { RequestIdMiddleware } from './core/http/middleware/request-id.middleware';
import { AppConfigModule } from './core/config/config.module';
import { DatabaseModule } from './core/database/database.module';
import { HealthModule } from './core/health/health.module';
import { AppLoggerModule } from './core/logger/logger.module';
import { EventsModule } from './core/events/events.module';
import { NotificationsModule } from './core/notifications/notifications.module';
import { QueuesModule } from './core/queue/queues.module';
import { RedisModule } from './core/redis/redis.module';
import { AppThrottlerModule } from './core/redis/throttler.module';
import { AuthModule } from './modules/auth';
import { AuthorizationModule } from './modules/authorization';
import { OrganizationsModule } from './modules/organizations';
import { UsersModule } from './modules/users';

@Module({
  imports: [
    AppConfigModule,
    AppLoggerModule.forRoot(),
    EventsModule,
    RedisModule,
    DatabaseModule,
    QueuesModule,
    NotificationsModule,
    AppThrottlerModule,
    OrganizationsModule,
    AuthorizationModule,
    UsersModule,
    AuthModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ResponseEnvelopeInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes({ path: '{*path}', method: RequestMethod.ALL });
  }
}
