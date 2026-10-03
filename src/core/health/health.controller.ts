import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiProperty } from '@nestjs/swagger';
import { I18n, I18nContext } from 'nestjs-i18n';
import { ROUTES } from '../config/config.constants';
import { HealthService, type LiveHealth } from './health.contract';
import { Readiness } from './readiness.contract';
import { Public, SkipEnvelope } from '../http/http.decorators';
class LiveHealthDto {
  @ApiProperty({ type: String }) public status!: string;
  @ApiProperty({ type: String }) public message!: string;
  @ApiProperty({ type: String }) public timestamp!: string;
  @ApiProperty({ type: String }) public locale!: string;
}
class ReadyHealthDto {
  @ApiProperty({ type: String }) public status!: string;
  @ApiProperty({ type: Boolean }) public postgres!: boolean;
  @ApiProperty({ type: Boolean }) public redis!: boolean;
}
@Public()
@SkipEnvelope()
@Controller()
export class HealthController {
  public constructor(
    @Inject(HealthService) private readonly health: HealthService,
    @Inject(Readiness) private readonly readiness: Readiness,
  ) {}
  @Get(ROUTES.LIVE)
  @ApiOperation({ operationId: 'healthLive' })
  @ApiOkResponse({ type: LiveHealthDto })
  public live(@I18n() context: I18nContext): LiveHealth {
    return this.health.live(context.lang);
  }
  @Get(ROUTES.READY)
  @ApiOperation({ operationId: 'healthReady' })
  @ApiOkResponse({ type: ReadyHealthDto })
  public ready(): Promise<{ status: string; postgres: boolean; redis: boolean }> {
    return this.readiness.check();
  }
}
