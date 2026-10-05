import type { SessionClaims } from '../../shared/identity.types';
export abstract class SessionVerifier {
  public abstract verify(access: string): Promise<SessionClaims>;
}
export abstract class SessionRevoker {
  public abstract revokeUser(org: string, user: string, exceptFamily?: string): Promise<void>;
}
