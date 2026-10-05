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
import { PropertiesService } from './properties.contract';
import { AnyAuthenticated } from '../authorization';
import type { AuthenticatedRequest } from '../authorization';
import { NeutralDto } from '../auth';
import { ApiEnvelope } from '../../core/http/api-envelope.decorator';
import { ValidatedBody, ValidatedQuery } from '../../core/http/validated-input.decorator';
import { PROPERTY_LIMITS as L } from '../../shared/property.constants';
import type { PropertyRecord, PropertyConfiguration } from '../../shared/property.types';
import {
  CreatePropertyDto,
  UpdatePropertyDto,
  PropertyListDto,
  PropertyDto,
  PropertyConfigDto,
  UpdatePropertyConfigDto,
} from './properties.dto';
@ApiTags('properties')
@Controller('properties')
export class PropertiesController {
  public constructor(@Inject(PropertiesService) private readonly service: PropertiesService) {}
  @AnyAuthenticated()
  @Post()
  @ApiEnvelope(PropertyDto, HttpStatus.CREATED)
  public create(
    @Req() req: AuthenticatedRequest,
    @ValidatedBody(CreatePropertyDto) body: CreatePropertyDto,
  ): Promise<PropertyRecord> {
    return this.service.create(req.authContext, body);
  }
  @AnyAuthenticated()
  @Get()
  @ApiEnvelope(PropertyDto, undefined, true)
  public async list(
    @Req() req: AuthenticatedRequest,
    @ValidatedQuery(PropertyListDto) query: PropertyListDto,
  ): Promise<{
    items: PropertyRecord[];
    page: { limit: number; hasNext: boolean; nextCursor: string | null };
  }> {
    const result = await this.service.list(req.authContext, query);
    return {
      items: result.items,
      page: { limit: L.PAGE, hasNext: !!result.nextCursor, nextCursor: result.nextCursor },
    };
  }
  @AnyAuthenticated()
  @Get(':id')
  @ApiEnvelope(PropertyDto)
  public get(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PropertyRecord> {
    return this.service.get(req.authContext, id);
  }
  @AnyAuthenticated()
  @Patch(':id')
  @ApiEnvelope(PropertyDto)
  public update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @ValidatedBody(UpdatePropertyDto) body: UpdatePropertyDto,
  ): Promise<PropertyRecord> {
    return this.service.update(req.authContext, id, body);
  }
  @AnyAuthenticated()
  @Delete(':id')
  @ApiEnvelope(NeutralDto)
  public async remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<NeutralDto> {
    await this.service.remove(req.authContext, id);
    return { accepted: true };
  }
  @AnyAuthenticated()
  @Get(':id/config')
  @ApiEnvelope(PropertyConfigDto)
  public getConfig(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PropertyConfiguration> {
    return this.service.getConfig(req.authContext, id);
  }
  @AnyAuthenticated()
  @Patch(':id/config')
  @ApiEnvelope(PropertyConfigDto)
  public setConfig(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @ValidatedBody(UpdatePropertyConfigDto) body: UpdatePropertyConfigDto,
  ): Promise<PropertyConfiguration> {
    return this.service.setConfig(req.authContext, id, body);
  }
}
