import { Module } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';
import { AppConfigModule } from '../../config/config.module';
import { createEmailProvider } from './email-provider.factory';
import { EmailProvider } from './email.provider';
import { EmailTemplateService } from './templates/email-template.service';

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
