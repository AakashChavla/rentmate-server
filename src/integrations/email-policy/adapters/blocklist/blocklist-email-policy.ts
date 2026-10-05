import { Injectable } from '@nestjs/common';
import { EmailPolicy } from '../../email-policy.contract';
import domains from '../../../../config/disposable-domains.json';
@Injectable()
export class BlocklistEmailPolicy extends EmailPolicy {
  public override allowed(email: string): boolean {
    return !domains.includes(email.toLowerCase().split('@').at(-1) ?? '');
  }
}
