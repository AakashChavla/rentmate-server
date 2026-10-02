import { Module } from '@nestjs/common';
import { AppConfigService } from '../../core/config/app-config.service';
import { AppConfigModule } from '../../core/config/config.module';
import { createEmailProvider } from './email-provider.factory';
import { EmailProvider } from './email.provider';
import { EmailTemplateService } from '../../core/notifications/email-template.service';

@Module({
  imports: [AppConfigModule],
  providers: [
    EmailTemplateService,
    {
      provide: EmailProvider,
      useFactory: (config: AppConfigService) => createEmailProvider(config),
      inject: [AppConfigService],
    },
  ],
  exports: [EmailProvider, EmailTemplateService],
})
export class EmailModule {}
