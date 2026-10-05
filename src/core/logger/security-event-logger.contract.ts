import type { SECURITY_EVENT } from '../../shared/identity.constants';
export abstract class SecurityEventLogger {
  public abstract record(
    event: (typeof SECURITY_EVENT)[keyof typeof SECURITY_EVENT],
    fields?: { userId?: string; organizationId?: string; email?: string; familyId?: string },
  ): void;
}
