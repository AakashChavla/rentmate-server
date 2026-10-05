import type { IdentityUser, OtpRecord } from '../../shared/identity.types';
export abstract class OtpService {
  public abstract send(email: string, purpose: OtpRecord['purpose']): Promise<void>;
  public abstract sendTo(user: IdentityUser, purpose: OtpRecord['purpose']): Promise<void>;
  public abstract consume(
    email: string,
    code: string,
    purpose: OtpRecord['purpose'],
  ): Promise<IdentityUser>;
}
