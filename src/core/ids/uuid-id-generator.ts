import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { IdGenerator } from './id-generator.contract';
@Injectable()
export class UuidIdGenerator extends IdGenerator {
  public override next(): string {
    return randomUUID();
  }
}
