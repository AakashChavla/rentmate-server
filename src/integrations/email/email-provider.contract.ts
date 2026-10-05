import type { Locale } from '../../shared/locale.constants';
export interface AuthEmail {
  recipient: string;
  locale: Locale;
  purpose: string;
  code?: string;
  inviteUrl?: string;
  organizationName?: string;
}
export abstract class EmailProvider {
  public abstract enqueue(email: AuthEmail): Promise<void>;
  public abstract deliver(payload: unknown): Promise<void>;
}
