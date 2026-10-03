import { Injectable } from '@nestjs/common';
import { Clock } from './clock.contract';
@Injectable()
export class SystemClock extends Clock {
  public override now(): Date {
    return new Date();
  }
}
