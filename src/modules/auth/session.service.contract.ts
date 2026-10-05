import type { SessionClaims, SessionTokens, RequestMetadata } from '../../shared/identity.types';
export abstract class SessionService {
  public abstract create(
    org: string,
    user: string,
    metadata: RequestMetadata,
    family?: string,
  ): Promise<SessionTokens>;
  public abstract refresh(token: string, metadata: RequestMetadata): Promise<SessionTokens>;
  public abstract logout(token: string): Promise<void>;
  public abstract revokeFamily(claims: SessionClaims): Promise<void>;
}
