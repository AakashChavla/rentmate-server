import { Controller, Get, Patch, Req, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../authorization';
import type { AuthenticatedRequest } from '../authorization';
import { ApiEnvelope } from '../../core/http/api-envelope.decorator';
import { ValidatedBody } from '../../core/http/validated-input.decorator';
import { DOMAIN_PERMISSION as P } from '../../shared/property.constants';
import type { OrganizationRecord } from '../../shared/identity.types';
import { OrganizationService } from './organization-service.contract';
import { OrganizationDto, OrganizationUpdateDto } from './organization.dto';
@ApiTags('organization')
@Controller('organization')
export class OrganizationController {
  public constructor(@Inject(OrganizationService) private readonly service: OrganizationService) {}
  @RequirePermissions(P.ORG_READ)
  @Get()
  @ApiEnvelope(OrganizationDto)
  public get(@Req() req: AuthenticatedRequest): Promise<OrganizationRecord> {
    return this.service.get(req.authContext);
  }
  @RequirePermissions(P.ORG_UPDATE)
  @Patch()
  @ApiEnvelope(OrganizationDto)
  public update(
    @Req() req: AuthenticatedRequest,
    @ValidatedBody(OrganizationUpdateDto) body: OrganizationUpdateDto,
  ): Promise<OrganizationRecord> {
    return this.service.update(req.authContext, body);
  }
}
