import {
  Controller,
  Inject,
  Get,
  Post,
  Delete,
  Req,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AnyAuthenticated } from '../authorization';
import type { AuthenticatedRequest } from '../authorization';
import { NeutralDto } from '../auth';
import { Public } from '../../core/http/http.decorators';
import { AuthThrottleGuard } from '../../core/http/auth-throttle.guard';
import { ApiEnvelope } from '../../core/http/api-envelope.decorator';
import { ValidatedBody, ValidatedQuery } from '../../core/http/validated-input.decorator';
import { PROPERTY_LIMITS as L } from '../../shared/property.constants';
import type { InviteView } from '../../shared/property.types';
import { InvitationsService } from './invitations.contract';
import {
  CreateInvitationDto,
  AcceptInvitationDto,
  InvitationListDto,
  InvitationDto,
  InvitationAcceptedDto,
} from './invitations.dto';
@ApiTags('invitations')
@Controller('invitations')
export class InvitationsController {
  public constructor(@Inject(InvitationsService) private readonly service: InvitationsService) {}
  @AnyAuthenticated()
  @Post()
  @ApiEnvelope(InvitationDto, HttpStatus.CREATED)
  public create(
    @Req() req: AuthenticatedRequest,
    @ValidatedBody(CreateInvitationDto) body: CreateInvitationDto,
  ): Promise<InviteView> {
    return this.service.create(req.authContext, body);
  }
  @AnyAuthenticated()
  @Get()
  @ApiEnvelope(InvitationDto, undefined, true)
  public async list(
    @Req() req: AuthenticatedRequest,
    @ValidatedQuery(InvitationListDto) query: InvitationListDto,
  ): Promise<{
    items: InviteView[];
    page: { limit: number; hasNext: boolean; nextCursor: string | null };
  }> {
    const result = await this.service.list(req.authContext, query);
    return {
      items: result.items,
      page: { limit: L.PAGE, hasNext: !!result.nextCursor, nextCursor: result.nextCursor },
    };
  }
  @AnyAuthenticated()
  @Post(':id/resend')
  @HttpCode(HttpStatus.OK)
  @ApiEnvelope(InvitationDto)
  public resend(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InviteView> {
    return this.service.resend(req.authContext, id);
  }
  @AnyAuthenticated()
  @Delete(':id')
  @ApiEnvelope(NeutralDto)
  public async revoke(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<NeutralDto> {
    await this.service.revoke(req.authContext, id);
    return { accepted: true };
  }
  @Public()
  @UseGuards(AuthThrottleGuard)
  @Post('accept')
  @HttpCode(HttpStatus.OK)
  @ApiEnvelope(InvitationAcceptedDto)
  public accept(
    @ValidatedBody(AcceptInvitationDto) body: AcceptInvitationDto,
  ): Promise<InvitationAcceptedDto> {
    return this.service.accept(body.token, body.fullName, body.password);
  }
}
