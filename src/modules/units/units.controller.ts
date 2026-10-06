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
import { ValidatedBody, ValidatedQuery } from '../../core/http/validated-input.decorator';
import { UnitsService } from './units.contract';
import {
  UnitInputDto,
  UnitPatchDto,
  UnitDto,
  UnitListDto,
  UnitStatusInputDto,
  UnitConfigDto,
  UnitConfigPatchDto,
} from './units.dto';
import { UNIT_LIMITS as L } from '../../shared/unit.constants';
import type { UnitRecord, UnitConfiguration } from '../../shared/unit.types';
@ApiTags('units')
@Controller()
export class UnitsController {
  public constructor(@Inject(UnitsService) private readonly service: UnitsService) {}
  @AnyAuthenticated()
  @Post('properties/:propertyId/units')
  @ApiEnvelope(UnitDto, HttpStatus.CREATED)
  public create(
    @Req() req: AuthenticatedRequest,
    @Param('propertyId', ParseUUIDPipe) property: string,
    @ValidatedBody(UnitInputDto) input: UnitInputDto,
  ): Promise<UnitRecord> {
    return this.service.create(req.authContext, property, input);
  }
  @AnyAuthenticated() @Get('units') @ApiEnvelope(UnitDto, undefined, true) public list(
    @Req() req: AuthenticatedRequest,
    @ValidatedQuery(UnitListDto) filter: UnitListDto,
  ): Promise<{
    items: UnitRecord[];
    page: { limit: number; hasNext: boolean; nextCursor: string | null };
  }> {
    return this.page(req, filter);
  }
  @AnyAuthenticated()
  @Get('properties/:propertyId/units')
  @ApiEnvelope(UnitDto, undefined, true)
  public propertyList(
    @Req() req: AuthenticatedRequest,
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @ValidatedQuery(UnitListDto) filter: UnitListDto,
  ): Promise<{
    items: UnitRecord[];
    page: { limit: number; hasNext: boolean; nextCursor: string | null };
  }> {
    return this.page(req, Object.assign({}, filter, { propertyId }));
  }
  private async page(
    req: AuthenticatedRequest,
    filter: UnitListDto,
  ): Promise<{
    items: UnitRecord[];
    page: { limit: number; hasNext: boolean; nextCursor: string | null };
  }> {
    const value = await this.service.list(req.authContext, filter);
    return {
      ...value,
      page: { limit: L.PAGE, hasNext: !!value.nextCursor, nextCursor: value.nextCursor },
    };
  }
  @AnyAuthenticated() @Get('units/:id') @ApiEnvelope(UnitDto) public get(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UnitRecord> {
    return this.service.get(req.authContext, id);
  }
  @AnyAuthenticated() @Patch('units/:id') @ApiEnvelope(UnitDto) public update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @ValidatedBody(UnitPatchDto) input: UnitPatchDto,
  ): Promise<UnitRecord> {
    return this.service.update(req.authContext, id, input);
  }
  @AnyAuthenticated() @Delete('units/:id') @ApiEnvelope(NeutralDto) public async remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<NeutralDto> {
    await this.service.remove(req.authContext, id);
    return { accepted: true };
  }
  @AnyAuthenticated() @Patch('units/:id/status') @ApiEnvelope(UnitDto) public status(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @ValidatedBody(UnitStatusInputDto) input: UnitStatusInputDto,
  ): Promise<UnitRecord> {
    return this.service.status(req.authContext, id, input);
  }
  @AnyAuthenticated() @Get('units/:id/config') @ApiEnvelope(UnitConfigDto) public config(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UnitConfiguration> {
    return this.service.config(req.authContext, id);
  }
  @AnyAuthenticated() @Patch('units/:id/config') @ApiEnvelope(UnitConfigDto) public setConfig(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @ValidatedBody(UnitConfigPatchDto) input: UnitConfigPatchDto,
  ): Promise<UnitConfiguration> {
    return this.service.setConfig(req.authContext, id, input);
  }
}
