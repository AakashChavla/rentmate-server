import {
  AuthRepository,
  type PasswordIdentity,
} from '../../modules/auth/repositories/auth.repository.contract';
import type { RefreshRecord, OtpRecord, RegistrationInput } from '../../shared/identity.types';
export class FakeAuthRepository extends AuthRepository {
  public readonly identities = new Map<string, PasswordIdentity>();
  public readonly refreshes = new Map<string, RefreshRecord>();
  public readonly otps = new Map<string, OtpRecord>();
  public consents = 0;
  public cleanupBefore: Date | undefined;
  public override findIdentity(email: string): Promise<PasswordIdentity | null> {
    return Promise.resolve(this.identities.get(email) ?? null);
  }
  public override createRefresh(record: RefreshRecord): Promise<void> {
    this.refreshes.set(record.id, { ...record });
    return Promise.resolve();
  }
  public override refresh(org: string, user: string, id: string): Promise<RefreshRecord | null> {
    const value = this.refreshes.get(id);
    return Promise.resolve(
      value?.organizationId === org && value.userId === user ? { ...value } : null,
    );
  }
  public override rotate(
    org: string,
    user: string,
    id: string,
    replacement: RefreshRecord,
    time: Date,
  ): Promise<boolean> {
    const value = this.refreshes.get(id);
    if (!value || value.organizationId !== org || value.userId !== user || value.revokedAt)
      return Promise.resolve(false);
    value.revokedAt = time;
    value.replacedById = replacement.id;
    this.refreshes.set(replacement.id, replacement);
    return Promise.resolve(true);
  }
  public override revokeFamily(
    org: string,
    user: string,
    family: string,
    time: Date,
  ): Promise<void> {
    for (const value of this.refreshes.values())
      if (
        value.organizationId === org &&
        value.userId === user &&
        value.familyId === family &&
        !value.revokedAt
      )
        value.revokedAt = time;
    return Promise.resolve();
  }
  public override revokeUser(
    org: string,
    user: string,
    time: Date,
    exceptFamily?: string,
  ): Promise<string[]> {
    const families: string[] = [];
    for (const value of this.refreshes.values())
      if (
        value.organizationId === org &&
        value.userId === user &&
        value.familyId !== exceptFamily
      ) {
        value.revokedAt = time;
        families.push(value.familyId);
      }
    return Promise.resolve(families);
  }
  public override createOtp(record: Omit<OtpRecord, 'consumedAt'>): Promise<void> {
    for (const old of this.otps.values())
      if (
        old.organizationId === record.organizationId &&
        old.userId === record.userId &&
        old.purpose === record.purpose
      )
        old.consumedAt = new Date();
    this.otps.set(record.id, { ...record, consumedAt: null });
    return Promise.resolve();
  }
  public override latestOtp(
    org: string,
    user: string,
    purpose: OtpRecord['purpose'],
  ): Promise<OtpRecord | null> {
    return Promise.resolve(
      [...this.otps.values()]
        .filter(
          (value) =>
            value.organizationId === org &&
            value.userId === user &&
            value.purpose === purpose &&
            !value.consumedAt,
        )
        .at(-1) ?? null,
    );
  }
  public override consumeOtp(org: string, user: string, id: string, time: Date): Promise<boolean> {
    const value = this.otps.get(id);
    if (
      !value ||
      value.organizationId !== org ||
      value.userId !== user ||
      value.consumedAt ||
      value.expiresAt <= time
    )
      return Promise.resolve(false);
    value.consumedAt = time;
    return Promise.resolve(true);
  }
  public override consent(
    _org: string,
    _user: string,
    _input: RegistrationInput,
    _ip: string,
    _time: Date,
  ): Promise<void> {
    this.consents += 2;
    return Promise.resolve();
  }
  public override cleanup(before: Date): Promise<number> {
    this.cleanupBefore = before;
    return Promise.resolve(1);
  }
}
