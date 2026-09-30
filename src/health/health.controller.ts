import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { SkipEnvelope } from '../common/decorators/skip-envelope.decorator';
import { RedisHealthIndicator } from './redis.health';

@ApiTags('health')
@SkipThrottle()
@SkipEnvelope()
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: TypeOrmHealthIndicator,
    private readonly redis: RedisHealthIndicator,
  ) {}

  @Get('live')
  @HealthCheck()
  @ApiOkResponse({ description: 'Process is up' })
  live() {
    return this.health.check([]);
  }

  @Get('ready')
  @HealthCheck()
  @ApiOkResponse({ description: 'Postgres and Redis are reachable' })
  ready() {
    return this.health.check([
      () => this.database.pingCheck('postgres'),
      () => this.redis.isHealthy('redis'),
    ]);
  }
}
