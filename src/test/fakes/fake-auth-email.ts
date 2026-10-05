import { EmailProvider, type AuthEmail } from '../../integrations/email/email-provider.contract';
export class FakeAuthEmail extends EmailProvider {
  public readonly sent: AuthEmail[] = [];
  public override enqueue(email: AuthEmail): Promise<void> {
    this.sent.push(email);
    return Promise.resolve();
  }
  public override deliver(_payload: unknown): Promise<void> {
    return Promise.resolve();
  }
  public code(email: string): string {
    const message = this.sent.filter((item) => item.recipient === email && item.code).at(-1);
    if (!message?.code) throw new Error('No fixture OTP email');
    return message.code;
  }
}
