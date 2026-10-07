import {
  Controller,
  Inject,
  Get,
  Post,
  Param,
  Req,
  ParseUUIDPipe,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AnyAuthenticated, type AuthenticatedRequest } from '../authorization';
import { ApiEnvelope } from '../../core/http/api-envelope.decorator';
import { ValidatedBody, ValidatedQuery } from '../../core/http/validated-input.decorator';
import { LEASE_LIMIT as L } from '../../shared/lease.constants';

import { LeasesService } from './leases.contract';
import {
  LeaseInputDto,
  LeaseDto,
  LeaseSummaryDto,
  DepositDto,
  TerminateDto,
  AvailabilityDto,
} from './leases.dto';
import { DomainFilterDto } from '../tenants';
import type { LeaseRecord, LeaseView } from '../../shared/lease.types';
@ApiTags('leases')
@Controller('leases')
export class LeasesController {
  public constructor(@Inject(LeasesService) private readonly service: LeasesService) {}
  @AnyAuthenticated()
  @Post()
  @ApiEnvelope(LeaseDto, HttpStatus.CREATED)
  public create(
    @Req() req: AuthenticatedRequest,
    @ValidatedBody(LeaseInputDto) input: LeaseInputDto,
  ): Promise<LeaseView> {
    return this.service.create(req.authContext, input);
  }
  @AnyAuthenticated()
  @Post('availability')
  @ApiEnvelope(AvailabilityDto, HttpStatus.CREATED)
  public available(
    @Req() req: AuthenticatedRequest,
    @ValidatedBody(LeaseInputDto) input: LeaseInputDto,
  ): Promise<{ available: boolean }> {
    return this.service.available(req.authContext, input);
  }
  @AnyAuthenticated()
  @Get()
  @ApiEnvelope(LeaseSummaryDto, undefined, true)
  public async list(
    @Req() req: AuthenticatedRequest,
    @ValidatedQuery(DomainFilterDto) filter: DomainFilterDto,
  ): Promise<{
    items: LeaseRecord[];
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
  @ApiEnvelope(LeaseDto)
  public get(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<LeaseView> {
    return this.service.get(req.authContext, id);
  }
  @AnyAuthenticated()
  @Post(':id/deposit')
  @ApiEnvelope(LeaseDto, HttpStatus.CREATED)
  public deposit(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @ValidatedBody(DepositDto) input: DepositDto,
  ): Promise<LeaseView> {
    return this.service.deposit(req.authContext, id, input.reference);
  }
  @AnyAuthenticated()
  @Post(':id/renew')
  @ApiEnvelope(LeaseDto, HttpStatus.CREATED)
  public renew(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @ValidatedBody(LeaseInputDto) input: LeaseInputDto,
  ): Promise<LeaseView> {
    return this.service.renew(req.authContext, id, input);
  }
  @AnyAuthenticated()
  @Post(':id/terminate')
  @ApiEnvelope(LeaseDto, HttpStatus.CREATED)
  public terminate(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @ValidatedBody(TerminateDto) input: TerminateDto,
  ): Promise<LeaseView> {
    return this.service.terminate(req.authContext, id, input.reason);
  }
}
