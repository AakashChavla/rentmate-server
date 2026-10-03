import { Clock } from '../clock.contract';
export class FakeClock extends Clock {
  public constructor(private readonly instant: Date) {
    super();
  }
  public override now(): Date {
    return this.instant;
  }
}
