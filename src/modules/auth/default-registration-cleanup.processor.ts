import { Injectable, Inject } from '@nestjs/common';
import { RegistrationCleanup } from './registration-cleanup.contract';
import { AuthRepository } from './repositories/auth.repository.contract';
import { Clock } from '../../core/time/clock.contract';
import { IDENTITY_TTL as T } from '../../shared/identity.constants';
@Injectable()
export class DefaultRegistrationCleanup extends RegistrationCleanup {
  public constructor(
    @Inject(AuthRepository) private readonly repository: AuthRepository,
    @Inject(Clock) private readonly clock: Clock,
  ) {
    super();
  }
  public override async handle(_jobId: string, _data: unknown): Promise<void> {
    await this.repository.cleanup(new Date(this.clock.now().getTime() - T.REGISTRATION));
  }
}
