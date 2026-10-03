import { Inject, Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import type { I18nTranslations } from '../i18n/generated/i18n.generated';
import { Clock } from '../time/clock.contract';
import { HEALTH_STATUS } from '../config/config.constants';
import { HealthService, type LiveHealth } from './health.contract';
@Injectable()
export class DefaultHealthService extends HealthService {
  public constructor(
    @Inject(Clock) private readonly clock: Clock,
    @Inject(I18nService) private readonly i18n: I18nService<I18nTranslations>,
  ) {
    super();
  }
  public override live(locale: string): LiveHealth {
    return {
      status: HEALTH_STATUS.OK,
      message: this.i18n.translate('common.healthLive', { lang: locale }),
      timestamp: this.clock.now().toISOString(),
      locale,
    };
  }
}
