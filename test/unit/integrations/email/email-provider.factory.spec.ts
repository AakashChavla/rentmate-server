import { AppConfigService } from '../../../../src/config/app-config.service';
import { validateEnv } from '../../../../src/config/env.schema';
import { SmtpEmailProvider } from '../../../../src/integrations/email/adapters/smtp-email.provider';
import { createEmailProvider } from '../../../../src/integrations/email/email-provider.factory';

describe('EmailProvider Factory & Worker Fast-Fail', () => {
  it('throws an error for unsupported EMAIL_PROVIDER', () => {
    const invalidConfig = {
      email: {
        provider: 'invalid-provider' as any,
        smtp: { host: 'smtp.gmail.com', port: 465, secure: true },
      },
    } as AppConfigService;

    expect(() => createEmailProvider(invalidConfig)).toThrow(
      'Unsupported email provider: invalid-provider',
    );
  });

  it('fails fast on worker construction if SMTP_USER, SMTP_PASSWORD, or EMAIL_FROM are missing', () => {
    const incompleteConfig = {
      email: {
        provider: 'smtp',
        smtp: { host: 'smtp.gmail.com', port: 465, secure: true },
      },
    } as AppConfigService;

    expect(() => new SmtpEmailProvider(incompleteConfig)).toThrow(
      'Failed fast: missing required SMTP configuration',
    );
  });

  it('allows API environment validation to succeed without SMTP credentials', () => {
    const minimalEnv = {
      REDIS_URL: 'redis://localhost:6379',
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      JWT_ACCESS_SECRET: 'super-secret-access-token-key-12345',
      JWT_REFRESH_SECRET: 'super-secret-refresh-token-key-12345',
    };

    const config = validateEnv(minimalEnv);
    expect(config.email.provider).toBe('smtp');
    expect(config.email.smtp.host).toBe('smtp.gmail.com');
    expect(config.email.smtp.port).toBe(465);
    expect(config.email.from).toBeUndefined();
    expect(config.email.smtp.user).toBeUndefined();
    expect(config.email.smtp.password).toBeUndefined();
  });
});
