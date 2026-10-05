import type {
  IdentityUser,
  OtpRecord,
  RefreshRecord,
  RegistrationInput,
} from '../../../shared/identity.types';
export interface PasswordIdentity {
  user: IdentityUser;
  passwordHash: string | null;
}
export abstract class AuthRepository {
  public abstract findIdentity(email: string): Promise<PasswordIdentity | null>;
  public abstract createRefresh(record: RefreshRecord): Promise<void>;
  public abstract refresh(org: string, user: string, id: string): Promise<RefreshRecord | null>;
  public abstract rotate(
    org: string,
    user: string,
    id: string,
    replacement: RefreshRecord,
    time: Date,
  ): Promise<boolean>;
  public abstract revokeFamily(
    org: string,
    user: string,
    family: string,
    time: Date,
  ): Promise<void>;
  public abstract revokeUser(
    org: string,
    user: string,
    time: Date,
    exceptFamily?: string,
  ): Promise<string[]>;
  public abstract createOtp(record: Omit<OtpRecord, 'consumedAt'>): Promise<void>;
  public abstract latestOtp(
    org: string,
    user: string,
    purpose: OtpRecord['purpose'],
  ): Promise<OtpRecord | null>;
  public abstract consumeOtp(org: string, user: string, id: string, time: Date): Promise<boolean>;
  public abstract consent(
    org: string,
    user: string,
    input: RegistrationInput,
    ip: string,
    time: Date,
  ): Promise<void>;
  public abstract cleanup(before: Date): Promise<number>;
}
