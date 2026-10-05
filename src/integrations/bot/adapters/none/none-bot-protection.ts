import { Injectable } from '@nestjs/common';
import { BotProtection } from '../../bot-protection.contract';
@Injectable()
export class NoneBotProtection extends BotProtection {
  public override check(_ip: string): Promise<void> {
    return Promise.resolve();
  }
}
