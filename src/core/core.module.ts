import { Global, Module } from '@nestjs/common';
import { AppConfig } from './config/app-config.contract';
import { DefaultAppConfig } from './config/default-app-config.service';
import { Clock } from './time/clock.contract';
import { SystemClock } from './time/system-clock.service';
@Global()
@Module({
  providers: [
    { provide: AppConfig, useClass: DefaultAppConfig },
    { provide: Clock, useClass: SystemClock },
  ],
  exports: [AppConfig, Clock],
})
export class CoreModule {}
