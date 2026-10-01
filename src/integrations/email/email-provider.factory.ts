import { AppConfigService } from '../../config/app-config.service';
import { SmtpEmailProvider } from './adapters/smtp-email.provider';
import { EmailProvider } from './email.provider';

export function createEmailProvider(config: AppConfigService): EmailProvider {
  const providerType: string = config.email.provider;

  switch (providerType) {
    case 'smtp':
      return new SmtpEmailProvider(config);
    default:
      throw new Error(`Unsupported email provider: ${providerType}`);
  }
}
