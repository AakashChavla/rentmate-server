export abstract class OtpGenerator {
  public abstract generate(): string;
  public abstract digest(code: string, context: string): string;
  public abstract matches(code: string, context: string, digest: string): boolean;
}
