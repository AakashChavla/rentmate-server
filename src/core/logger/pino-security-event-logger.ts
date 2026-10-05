import { Inject, Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { SecurityEventLogger } from './security-event-logger.contract';
@Injectable()
export class PinoSecurityEventLogger extends SecurityEventLogger {
  public constructor(@Inject(PinoLogger) private readonly logger: PinoLogger) {
    super();
  }
  public override record(
    event: Parameters<SecurityEventLogger['record']>[0],
    fields: Parameters<SecurityEventLogger['record']>[1] = {},
  ): void {
    const { email, ...safe } = fields;
    this.logger.info(
      { ...safe, ...(email ? { email: email.replace(/^(.).*(@.*)$/, '$1***$2') } : {}), event },
      'Security event',
    );
  }
}
