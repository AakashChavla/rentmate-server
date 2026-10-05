export interface ExternalCallOptions {
  timeoutMs: number;
  attempts: number;
  onTimeout: () => void;
}
export abstract class ExternalCallPolicy {
  public abstract run<T>(action: () => Promise<T>, options: ExternalCallOptions): Promise<T>;
}
