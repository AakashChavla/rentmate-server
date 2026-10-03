export abstract class EventBus {
  public abstract publish(name: string, payload: unknown): void;
}
