import { Injectable, Inject } from '@nestjs/common';
import { randomInt, createHmac, timingSafeEqual } from 'node:crypto';
import { OtpGenerator } from '../../otp-generator.contract';
import { AppConfig } from '../../../../core/config/app-config.contract';
import { IDENTITY_LIMITS as L } from '../../../../shared/identity.constants';
@Injectable()
export class CryptoOtpGenerator extends OtpGenerator {
  public constructor(@Inject(AppConfig) private readonly config: AppConfig) {
    super();
  }
  public override generate(): string {
    return String(randomInt(L.OTP_MIN, L.OTP_MAX)).padStart(L.OTP_DIGITS, '0');
  }
  public override digest(code: string, context: string): string {
    return createHmac('sha256', this.config.get('OTP_HMAC_SECRET'))
      .update(`${context}:${code}`)
      .digest('hex');
  }
  public override matches(code: string, context: string, digest: string): boolean {
    const actual = Buffer.from(this.digest(code, context));
    const expected = Buffer.from(digest);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }
}
