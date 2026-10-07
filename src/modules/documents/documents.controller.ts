import {
  Controller,
  Inject,
  Get,
  Post,
  Delete,
  Param,
  Req,
  ParseUUIDPipe,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AnyAuthenticated, type AuthenticatedRequest } from '../authorization';
import { NeutralDto } from '../auth';
import { ApiEnvelope } from '../../core/http/api-envelope.decorator';
import { ValidatedBody } from '../../core/http/validated-input.decorator';

import { Query, Res, StreamableFile, ParseEnumPipe } from '@nestjs/common';
import { ApiConsumes, ApiBody } from '@nestjs/swagger';
import type { Response } from 'express';
import { DocumentsService } from './documents.contract';
import { DocumentDto, DocumentReviewDto, SignedDocumentDto } from './documents.dto';
import { MultipartReader } from '../../integrations/multipart/multipart-reader.contract';
import { DOCUMENT_TYPE } from '../../shared/lease.constants';
import type { DocumentType, DocumentView } from '../../shared/lease.types';
import { SkipEnvelope } from '../../core/http/http.decorators';
@ApiTags('documents')
@Controller()
export class DocumentsController {
  public constructor(
    @Inject(DocumentsService) private readonly service: DocumentsService,
    @Inject(MultipartReader) private readonly reader: MultipartReader,
  ) {}
  @AnyAuthenticated()
  @Post('tenants/:id/documents/:type')
  @ApiEnvelope(DocumentDto, HttpStatus.CREATED)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  public upload(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('type', new ParseEnumPipe(DOCUMENT_TYPE)) type: DocumentType,
  ): Promise<DocumentView> {
    return this.reader.receive(req, (source, mime) =>
      this.service.upload(req.authContext, id, type, source, mime),
    );
  }
  @AnyAuthenticated()
  @Get('tenants/:id/documents')
  @ApiEnvelope(DocumentDto, undefined, true)
  public list(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DocumentView[]> {
    return this.service.list(req.authContext, id);
  }
  @AnyAuthenticated()
  @Post('documents/:id/review')
  @ApiEnvelope(DocumentDto, HttpStatus.CREATED)
  public review(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @ValidatedBody(DocumentReviewDto) input: DocumentReviewDto,
  ): Promise<DocumentView> {
    return this.service.review(req.authContext, id, input.status, input.reason);
  }
  @AnyAuthenticated()
  @Get('documents/:id/download')
  @ApiEnvelope(SignedDocumentDto)
  public download(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ url: string; expiresAt: string }> {
    return this.service.download(req.authContext, id);
  }
  @AnyAuthenticated()
  @Get('documents/:id/content')
  @SkipEnvelope()
  public async content(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('expires') expires: string,
    @Query('signature') signature: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const file = await this.service.content(req.authContext, id, Number(expires), signature);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return new StreamableFile(file.stream, { type: file.mime, disposition: 'attachment' });
  }
  @AnyAuthenticated()
  @Delete('documents/:id')
  @ApiEnvelope(NeutralDto)
  public async remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<NeutralDto> {
    await this.service.remove(req.authContext, id);
    return { accepted: true };
  }
}
