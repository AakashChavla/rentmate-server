export abstract class FieldEncryptor {
  public abstract encrypt(value: string): string;
  public abstract decrypt(envelope: string): string;
  public abstract hash(value: string): string;
}
