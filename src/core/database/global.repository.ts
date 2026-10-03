export const AUTH_SCOPE_REASON = { LOGIN: 'login-identity', REFRESH: 'refresh-session' } as const;
export type AuthScopeReason = (typeof AUTH_SCOPE_REASON)[keyof typeof AUTH_SCOPE_REASON];
export abstract class AuthLookup<T> {
  public abstract findIdentity(value: string): Promise<T | null>;
}
export abstract class GlobalRepository<T> {
  protected constructor(private readonly lookup: AuthLookup<T>) {}
  public unscopedForAuth(reason: AuthScopeReason): AuthLookup<T> {
    if (!Object.values(AUTH_SCOPE_REASON).includes(reason)) throw new TypeError();
    return this.lookup;
  }
}
