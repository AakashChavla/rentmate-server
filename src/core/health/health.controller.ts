import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiProperty } from '@nestjs/swagger';
import { I18n, I18nContext } from 'nestjs-i18n';
import { ROUTES } from '../config/config.constants';
import { HealthService, type LiveHealth } from './health.contract';
class LiveHealthDto {
  @ApiProperty({ type: String }) public status!: string;
  @ApiProperty({ type: String }) public message!: string;
  @ApiProperty({ type: String }) public timestamp!: string;
  @ApiProperty({ type: String }) public locale!: string;
}
@Controller()
export class HealthController {
  public constructor(@Inject(HealthService) private readonly health: HealthService) {}
  @Get(ROUTES.LIVE)
  @ApiOperation({ operationId: 'healthLive' })
  @ApiOkResponse({ type: LiveHealthDto })
  public live(@I18n() context: I18nContext): LiveHealth {
    return this.health.live(context.lang);
  }
}
