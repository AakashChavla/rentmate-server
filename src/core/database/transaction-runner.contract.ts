export abstract class TransactionRunner {
  public abstract run<T>(action: () => Promise<T>): Promise<T>;
  public afterCommit(effect: () => Promise<void>): Promise<void> {
    return effect();
  }
}
