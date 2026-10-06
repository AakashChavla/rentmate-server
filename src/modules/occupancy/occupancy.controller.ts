import { Controller, Inject, Get, Param, Req, ParseUUIDPipe } from '@nestjs/common';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { AnyAuthenticated } from '../authorization';
import type { AuthenticatedRequest } from '../authorization';
import { ApiEnvelope } from '../../core/http/api-envelope.decorator';
import { OccupancyReadModel } from './occupancy.contract';
import type { OccupancySnapshot } from '../../shared/unit.types';
class OccupancyCountDto {
  @ApiProperty({ type: Number }) occupied!: number;
  @ApiProperty({ type: Number }) total!: number;
  @ApiProperty({ type: Number }) percent!: number;
}
export class OccupancyDto {
  @ApiProperty({ type: OccupancyCountDto }) units!: OccupancyCountDto;
  @ApiProperty({ type: OccupancyCountDto }) beds!: OccupancyCountDto;
}
@ApiTags('occupancy')
@Controller('properties/:propertyId/occupancy')
export class OccupancyController {
  public constructor(@Inject(OccupancyReadModel) private readonly service: OccupancyReadModel) {}
  @AnyAuthenticated() @Get() @ApiEnvelope(OccupancyDto) public get(
    @Req() req: AuthenticatedRequest,
    @Param('propertyId', ParseUUIDPipe) property: string,
  ): Promise<OccupancySnapshot> {
    return this.service.get(req.authContext, property);
  }
}
