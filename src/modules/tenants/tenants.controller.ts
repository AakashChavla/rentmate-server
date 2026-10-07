import {
  Controller,
  Inject,
  Get,
  Post,
  Patch,
  Param,
  Req,
  ParseUUIDPipe,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AnyAuthenticated, type AuthenticatedRequest } from '../authorization';
import { NeutralDto } from '../auth';
import { ApiEnvelope } from '../../core/http/api-envelope.decorator';
import { ValidatedBody, ValidatedQuery } from '../../core/http/validated-input.decorator';
import { LEASE_LIMIT as L } from '../../shared/lease.constants';

import { TenantsService } from './tenants.contract';
import {
  TenantInputDto,
  TenantPatchDto,
  TenantReviewDto,
  TenantDto,
  DomainFilterDto,
} from './tenants.dto';
import type { TenantView } from '../../shared/lease.types';
@ApiTags('tenants')
@Controller('tenants')
export class TenantsController {
  public constructor(@Inject(TenantsService) private readonly service: TenantsService) {}
  @AnyAuthenticated()
  @Post()
  @ApiEnvelope(TenantDto, HttpStatus.CREATED)
  public create(
    @Req() req: AuthenticatedRequest,
    @ValidatedBody(TenantInputDto) input: TenantInputDto,
  ): Promise<TenantView> {
    return this.service.create(req.authContext, input);
  }
  @AnyAuthenticated()
  @Get()
  @ApiEnvelope(TenantDto, undefined, true)
  public async list(
    @Req() req: AuthenticatedRequest,
    @ValidatedQuery(DomainFilterDto) filter: DomainFilterDto,
  ): Promise<{
    items: TenantView[];
    page: { limit: number; hasNext: boolean; nextCursor: string | null };
  }> {
    const result = await this.service.list(req.authContext, filter);
    return {
      ...result,
      page: { limit: L.PAGE, hasNext: !!result.nextCursor, nextCursor: result.nextCursor },
    };
  }
  @AnyAuthenticated()
  @Get(':id')
  @ApiEnvelope(TenantDto)
  public get(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TenantView> {
    return this.service.get(req.authContext, id);
  }
  @AnyAuthenticated()
  @Patch(':id')
  @ApiEnvelope(TenantDto)
  public update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @ValidatedBody(TenantPatchDto) input: TenantPatchDto,
  ): Promise<TenantView> {
    return this.service.update(req.authContext, id, input);
  }
  @AnyAuthenticated()
  @Post(':id/review')
  @ApiEnvelope(TenantDto, HttpStatus.CREATED)
  public review(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @ValidatedBody(TenantReviewDto) input: TenantReviewDto,
  ): Promise<TenantView> {
    return this.service.review(req.authContext, id, input.status, input.reason);
  }
  @AnyAuthenticated()
  @Post(':id/invite')
  @ApiEnvelope(NeutralDto, HttpStatus.CREATED)
  public async invite(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<NeutralDto> {
    await this.service.invite(req.authContext, id);
    return { accepted: true };
  }
}
