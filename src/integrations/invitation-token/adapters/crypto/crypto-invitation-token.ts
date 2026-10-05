import { Injectable } from '@nestjs/common';
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { InvitationToken } from '../../invitation-token.contract';
import { INVITE_TOKEN as T } from '../../../../shared/property.constants';
@Injectable()
export class CryptoInvitationToken extends InvitationToken {
  public override generate(): string {
    return randomBytes(T.BYTES).toString('hex');
  }
  public override digest(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
  public override matches(token: string, digest: string): boolean {
    const expected = Buffer.from(digest, 'hex');
    const actual = Buffer.from(this.digest(token), 'hex');
    return expected.length === T.BYTES && timingSafeEqual(actual, expected);
  }
}
