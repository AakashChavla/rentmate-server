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
import { FloorsService } from './units.contract';
import { FloorDto, FloorInputDto, FloorPatchDto } from './units.dto';
import type { FloorRecord } from '../../shared/unit.types';
@ApiTags('floors')
@Controller()
export class FloorsController {
  public constructor(@Inject(FloorsService) private readonly service: FloorsService) {}
  @AnyAuthenticated()
  @Post('properties/:propertyId/floors')
  @ApiEnvelope(FloorDto, HttpStatus.CREATED)
  public create(
    @Req() req: AuthenticatedRequest,
    @Param('propertyId', ParseUUIDPipe) property: string,
    @ValidatedBody(FloorInputDto) input: FloorInputDto,
  ): Promise<FloorRecord> {
    return this.service.create(req.authContext, property, input);
  }
  @AnyAuthenticated()
  @Get('properties/:propertyId/floors')
  @ApiEnvelope(FloorDto, undefined, true)
  public async list(
    @Req() req: AuthenticatedRequest,
    @Param('propertyId', ParseUUIDPipe) property: string,
  ): Promise<FloorRecord[]> {
    return this.service.list(req.authContext, property);
  }
  @AnyAuthenticated() @Get('floors/:id') @ApiEnvelope(FloorDto) public get(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FloorRecord> {
    return this.service.get(req.authContext, id);
  }
  @AnyAuthenticated() @Patch('floors/:id') @ApiEnvelope(FloorDto) public update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @ValidatedBody(FloorPatchDto) input: FloorPatchDto,
  ): Promise<FloorRecord> {
    return this.service.update(req.authContext, id, input);
  }
  @AnyAuthenticated() @Delete('floors/:id') @ApiEnvelope(NeutralDto) public async remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<NeutralDto> {
    await this.service.remove(req.authContext, id);
    return { accepted: true };
  }
}
