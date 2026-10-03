export abstract class TransactionRunner {
  public abstract run<T>(action: () => Promise<T>): Promise<T>;
}
