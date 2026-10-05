import type { SessionClaims } from '../../shared/identity.types';
export abstract class TokenSigner {
  public abstract sign(claims: Omit<SessionClaims, 'iat'>, refresh: boolean): Promise<string>;
  public abstract verify(token: string, refresh: boolean): Promise<SessionClaims>;
}
