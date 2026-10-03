import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventBus } from './event-bus.contract';
@Injectable()
export class DefaultEventBus extends EventBus {
  public constructor(@Inject(EventEmitter2) private readonly emitter: EventEmitter2) {
    super();
  }
  public override publish(name: string, payload: unknown): void {
    this.emitter.emit(name, payload);
  }
}
