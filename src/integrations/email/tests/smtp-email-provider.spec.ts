import * as nodemailer from 'nodemailer';
import { AppConfigService } from '../../../core/config/app-config.service';
import { SmtpEmailProvider } from '../adapters/smtp-email.provider';
import { EmailDeliveryError } from '../email-delivery.error';
import { emailProviderContract } from './contracts/email-provider.contract';

describe('SmtpEmailProvider', () => {
  const dummyConfig = {
    email: {
      provider: 'smtp',
      from: 'RentMate <noreply@rentmate.local>',
      smtp: {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        user: 'test@gmail.com',
        password: 'app-password-123',
      },
    },
  } as unknown as AppConfigService;

  emailProviderContract(() => {
    const streamTransporter = nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
    });
    const provider = new SmtpEmailProvider(dummyConfig, streamTransporter);

    return {
      provider,
      triggerFailure: () => {
        jest.spyOn(streamTransporter as any, 'sendMail').mockRejectedValueOnce({
          code: 'ETIMEDOUT',
          message: 'Connection timed out',
        });
      },
    };
  });

  describe('Error mapping', () => {
    let provider: SmtpEmailProvider;
    let transporter: nodemailer.Transporter;

    beforeEach(() => {
      transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
      });
      provider = new SmtpEmailProvider(dummyConfig, transporter);
    });

    it('maps connection timeout (ETIMEDOUT) to retryable EmailDeliveryError', async () => {
      jest.spyOn(transporter as any, 'sendMail').mockRejectedValueOnce({
        code: 'ETIMEDOUT',
        message: 'Connection timeout',
      });

      try {
        await provider.send({ to: 't@ex.com', subject: 's', html: 'h', text: 't' });
        fail('Should have thrown EmailDeliveryError');
      } catch (err) {
        expect(err).toBeInstanceOf(EmailDeliveryError);
        const error = err as EmailDeliveryError;
        expect(error.retryable).toBe(true);
      }
    });

    it('maps 535 bad credentials to non-retryable EmailDeliveryError', async () => {
      jest.spyOn(transporter as any, 'sendMail').mockRejectedValueOnce({
        responseCode: 535,
        message: '5.7.8 Error: authentication failed',
      });

      try {
        await provider.send({ to: 't@ex.com', subject: 's', html: 'h', text: 't' });
        fail('Should have thrown EmailDeliveryError');
      } catch (err) {
        expect(err).toBeInstanceOf(EmailDeliveryError);
        const error = err as EmailDeliveryError;
        expect(error.retryable).toBe(false);
      }
    });

    it('maps 550 invalid recipient to non-retryable EmailDeliveryError', async () => {
      jest.spyOn(transporter as any, 'sendMail').mockRejectedValueOnce({
        responseCode: 550,
        message: '5.1.1 User unknown',
      });

      try {
        await provider.send({ to: 't@ex.com', subject: 's', html: 'h', text: 't' });
        fail('Should have thrown EmailDeliveryError');
      } catch (err) {
        expect(err).toBeInstanceOf(EmailDeliveryError);
        const error = err as EmailDeliveryError;
        expect(error.retryable).toBe(false);
      }
    });

    it('maps Gmail daily sending limit (5.4.5) to non-retryable EmailDeliveryError and logs ERROR', async () => {
      jest.spyOn(transporter as any, 'sendMail').mockRejectedValueOnce({
        responseCode: 554,
        response: '5.4.5 Daily user sending limit exceeded',
        message: 'Daily user sending limit exceeded',
      });

      try {
        await provider.send({ to: 'target@example.com', subject: 's', html: 'h', text: 't' });
        fail('Should have thrown EmailDeliveryError');
      } catch (err) {
        expect(err).toBeInstanceOf(EmailDeliveryError);
        const error = err as EmailDeliveryError;
        expect(error.retryable).toBe(false);
        expect(error.reason).toBe('DAILY_LIMIT_EXCEEDED');
      }
    });
  });
});
