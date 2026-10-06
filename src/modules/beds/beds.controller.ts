import {
  Controller,
  Inject,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Req,
  ParseUUIDPipe,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AnyAuthenticated } from '../authorization';
import type { AuthenticatedRequest } from '../authorization';
import { NeutralDto } from '../auth';
import { ApiEnvelope } from '../../core/http/api-envelope.decorator';
import { ValidatedBody } from '../../core/http/validated-input.decorator';
import { BedsService } from './beds.contract';
import { BedInputDto, BedDto } from './beds.dto';
import { UnitStatusInputDto } from '../units';
import type { BedRecord } from '../../shared/unit.types';
@ApiTags('beds')
@Controller()
export class BedsController {
  public constructor(@Inject(BedsService) private readonly service: BedsService) {}
  @AnyAuthenticated()
  @Post('units/:unitId/beds')
  @ApiEnvelope(BedDto, HttpStatus.CREATED)
  public create(
    @Req() req: AuthenticatedRequest,
    @Param('unitId', ParseUUIDPipe) unit: string,
    @ValidatedBody(BedInputDto) input: BedInputDto,
  ): Promise<BedRecord> {
    return this.service.create(req.authContext, unit, input.label);
  }
  @AnyAuthenticated()
  @Get('units/:unitId/beds')
  @ApiEnvelope(BedDto, undefined, true)
  public async list(
    @Req() req: AuthenticatedRequest,
    @Param('unitId', ParseUUIDPipe) unit: string,
  ): Promise<BedRecord[]> {
    return this.service.list(req.authContext, unit);
  }
  @AnyAuthenticated() @Get('beds/:id') @ApiEnvelope(BedDto) public get(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BedRecord> {
    return this.service.get(req.authContext, id);
  }
  @AnyAuthenticated() @Patch('beds/:id') @ApiEnvelope(BedDto) public update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @ValidatedBody(BedInputDto) input: BedInputDto,
  ): Promise<BedRecord> {
    return this.service.update(req.authContext, id, input.label);
  }
  @AnyAuthenticated() @Delete('beds/:id') @ApiEnvelope(NeutralDto) public async remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<NeutralDto> {
    await this.service.remove(req.authContext, id);
    return { accepted: true };
  }
  @AnyAuthenticated() @Patch('beds/:id/status') @ApiEnvelope(BedDto) public status(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @ValidatedBody(UnitStatusInputDto) input: UnitStatusInputDto,
  ): Promise<BedRecord> {
    return this.service.status(req.authContext, id, input);
  }
}
