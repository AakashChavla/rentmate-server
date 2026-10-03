import { IdGenerator } from '../../core/ids/id-generator.contract';
export class FakeIdGenerator extends IdGenerator {
  public override next(): string {
    return '00000000-0000-4000-8000-000000000001';
  }
}
