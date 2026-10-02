import { BRAND_NAME, EmailTemplateService } from '../src/core/notifications/email-template.service';

describe('EmailTemplateService', () => {
  let service: EmailTemplateService;

  beforeEach(() => {
    service = new EmailTemplateService();
  });

  it('renders OTP email for LOGIN with subject, html, text, and brand name', () => {
    const rendered = service.render({
      template: 'otp',
      to: 'user@example.com',
      data: {
        code: '123456',
        purpose: 'LOGIN',
        expiresInMinutes: 5,
      },
    });

    expect(rendered.subject).toBe(`Your ${BRAND_NAME} Login Code`);
    expect(rendered.html).toContain('123456');
    expect(rendered.html).toContain('log in');
    expect(rendered.html).toContain('5 minutes');
    expect(rendered.text).toContain('Verification Code: 123456');
    expect(rendered.text).toContain('log in');
  });

  it('renders OTP email for PASSWORD_RESET with specific wording', () => {
    const rendered = service.render({
      template: 'otp',
      to: 'user@example.com',
      data: {
        code: '654321',
        purpose: 'PASSWORD_RESET',
        expiresInMinutes: 5,
      },
    });

    expect(rendered.subject).toBe(`Reset your ${BRAND_NAME} Password`);
    expect(rendered.html).toContain('reset your');
    expect(rendered.text).toContain('reset your');
  });

  it('escapes script tags or HTML in code/purpose data to prevent XSS', () => {
    const rendered = service.render({
      template: 'otp',
      to: 'user@example.com',
      data: {
        code: '<script>alert("xss")</script>',
        purpose: 'CUSTOM_<TAG>' as any,
        expiresInMinutes: 5,
      },
    });

    expect(rendered.html).not.toContain('<script>');
    expect(rendered.html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });
});
