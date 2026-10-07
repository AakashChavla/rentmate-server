export abstract class LeaseSweep {
  public abstract tryLock(): Promise<boolean>;
}
