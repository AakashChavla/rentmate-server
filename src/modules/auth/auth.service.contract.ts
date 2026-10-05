import type {
  PermissionContext,
  RegistrationInput,
  RequestMetadata,
  SessionClaims,
  SessionTokens,
} from '../../shared/identity.types';
export interface SignedIn {
  tokens: SessionTokens;
  me: PermissionContext;
}
export abstract class AuthService {
  public abstract register(input: RegistrationInput, metadata: RequestMetadata): Promise<void>;
  public abstract verifyRegistration(
    email: string,
    code: string,
    metadata: RequestMetadata,
  ): Promise<SignedIn>;
  public abstract login(
    email: string,
    password: string,
    metadata: RequestMetadata,
  ): Promise<SignedIn>;
  public abstract otpLogin(
    email: string,
    code: string,
    metadata: RequestMetadata,
  ): Promise<SignedIn>;
  public abstract reset(email: string, code: string, password: string): Promise<void>;
  public abstract change(
    claims: SessionClaims,
    currentPassword: string,
    password: string,
  ): Promise<void>;
}
