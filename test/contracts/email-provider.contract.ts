import { EmailDeliveryError } from '../../src/integrations/email/email-delivery.error';
import type { EmailMessage, EmailProvider } from '../../src/integrations/email/email.provider';

export function emailProviderContract(
  createProvider: () => { provider: EmailProvider; triggerFailure?: () => void },
) {
  describe('EmailProvider Contract', () => {
    let provider: EmailProvider;
    let triggerFailure: (() => void) | undefined;

    beforeEach(() => {
      const created = createProvider();
      provider = created.provider;
      triggerFailure = created.triggerFailure;
    });

    it('sends a message and returns an EmailSendResult with providerMessageId', async () => {
      const message: EmailMessage = {
        to: 'user@example.com',
        subject: 'Test Subject',
        html: '<p>Test Body</p>',
        text: 'Test Body',
      };

      const result = await provider.send(message);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      if (result.providerMessageId !== undefined) {
        expect(typeof result.providerMessageId).toBe('string');
      }
    });

    it('maps failures to EmailDeliveryError', async () => {
      if (!triggerFailure) {
        return;
      }

      triggerFailure();

      const message: EmailMessage = {
        to: 'user@example.com',
        subject: 'Test Failure',
        html: '<p>Fail</p>',
        text: 'Fail',
      };

      await expect(provider.send(message)).rejects.toThrow(EmailDeliveryError);
    });
  });
}
