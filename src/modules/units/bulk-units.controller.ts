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
import { AnyAuthenticated } from '../authorization';
import type { AuthenticatedRequest } from '../authorization';

import { ApiEnvelope } from '../../core/http/api-envelope.decorator';
import { ValidatedBody } from '../../core/http/validated-input.decorator';
import { BulkUnitsService } from './bulk.contract';
import { BulkPatternDto, BulkResultDto, BulkJobDto } from './bulk.dto';
import type { BulkRecord, BulkResult } from '../../shared/unit.types';
@ApiTags('units')
@Controller('properties/:propertyId/units/bulk')
export class BulkUnitsController {
  public constructor(@Inject(BulkUnitsService) private readonly service: BulkUnitsService) {}
  @AnyAuthenticated() @Post() @ApiEnvelope(BulkResultDto, HttpStatus.CREATED) public create(
    @Req() req: AuthenticatedRequest,
    @Param('propertyId', ParseUUIDPipe) property: string,
    @ValidatedBody(BulkPatternDto) input: BulkPatternDto,
  ): Promise<BulkResult> {
    return this.service.create(req.authContext, property, input);
  }
  @AnyAuthenticated() @Get(':id') @ApiEnvelope(BulkJobDto) public get(
    @Req() req: AuthenticatedRequest,
    @Param('propertyId', ParseUUIDPipe) property: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BulkRecord> {
    return this.service.get(req.authContext, property, id);
  }
}
