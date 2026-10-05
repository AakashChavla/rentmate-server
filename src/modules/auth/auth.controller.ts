import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service.contract';
import { SessionService } from './session.service.contract';
import { OtpService } from './otp.service.contract';
import { AuthCookies } from './auth-cookies';
import { AuthThrottleGuard } from './auth-throttle.guard';
import { Public } from '../../core/http/http.decorators';
import { ValidatedBody } from '../../core/http/validated-input.decorator';
import { ApiEnvelope } from '../../core/http/api-envelope.decorator';
import { AnyAuthenticated, type AuthenticatedRequest } from '../authorization';
import { COOKIE_NAMES } from '../../core/config/config.constants';
import { OTP_PURPOSE } from '../../shared/identity.constants';
import { AppException } from '../../core/errors/app-exception';
import { ErrorCode } from '../../core/errors/error-code.constants';
import {
  LoginDto,
  EmailDto,
  OtpDto,
  RegisterDto,
  ResetPasswordDto,
  ChangePasswordDto,
  NeutralDto,
} from './dto/auth.dto';
import { MeDto } from './dto/me.dto';
import type { PermissionContext, RequestMetadata } from '../../shared/identity.types';
const NEUTRAL = { accepted: true } as const;
@ApiTags('auth')
@Controller('auth')
@UseGuards(AuthThrottleGuard)
@ApiCookieAuth()
export class AuthController {
  public constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(SessionService) private readonly sessions: SessionService,
    @Inject(OtpService) private readonly otp: OtpService,
    @Inject(AuthCookies) private readonly cookies: AuthCookies,
  ) {}
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiEnvelope(NeutralDto, HttpStatus.ACCEPTED)
  public async register(
    @ValidatedBody(RegisterDto) body: RegisterDto,
    @Req() request: Request,
  ): Promise<NeutralDto> {
    await this.auth.register(body, metadata(request));
    return NEUTRAL;
  }
  @Public()
  @Post('register/verify')
  @HttpCode(HttpStatus.OK)
  @ApiEnvelope(MeDto)
  public async verify(
    @ValidatedBody(OtpDto) body: OtpDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<PermissionContext> {
    const result = await this.auth.verifyRegistration(body.email, body.code, metadata(request));
    this.cookies.set(response, result.tokens);
    return result.me;
  }
  @Public()
  @Post('register/resend')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiEnvelope(NeutralDto, HttpStatus.ACCEPTED)
  public async resend(@ValidatedBody(EmailDto) body: EmailDto): Promise<NeutralDto> {
    await this.otp.send(body.email, OTP_PURPOSE.VERIFY);
    return NEUTRAL;
  }
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiEnvelope(MeDto)
  public async login(
    @ValidatedBody(LoginDto) body: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<PermissionContext> {
    const result = await this.auth.login(body.email, body.password, metadata(request));
    this.cookies.set(response, result.tokens);
    return result.me;
  }
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiEnvelope(NeutralDto)
  public async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<NeutralDto> {
    this.cookies.set(
      response,
      await this.sessions.refresh(refreshCookie(request), metadata(request)),
    );
    return NEUTRAL;
  }
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiEnvelope(NeutralDto)
  public async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<NeutralDto> {
    try {
      await this.sessions.logout(refreshCookie(request));
    } finally {
      this.cookies.clear(response);
    }
    return NEUTRAL;
  }
  @Public()
  @Post('otp/send')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiEnvelope(NeutralDto, HttpStatus.ACCEPTED)
  public async sendOtp(@ValidatedBody(EmailDto) body: EmailDto): Promise<NeutralDto> {
    await this.otp.send(body.email, OTP_PURPOSE.LOGIN);
    return NEUTRAL;
  }
  @Public()
  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiEnvelope(MeDto)
  public async otpLogin(
    @ValidatedBody(OtpDto) body: OtpDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<PermissionContext> {
    const result = await this.auth.otpLogin(body.email, body.code, metadata(request));
    this.cookies.set(response, result.tokens);
    return result.me;
  }
  @Public()
  @Post('password/forgot')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiEnvelope(NeutralDto, HttpStatus.ACCEPTED)
  public async forgot(@ValidatedBody(EmailDto) body: EmailDto): Promise<NeutralDto> {
    await this.otp.send(body.email, OTP_PURPOSE.RESET);
    return NEUTRAL;
  }
  @Public()
  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  @ApiEnvelope(NeutralDto)
  public async reset(@ValidatedBody(ResetPasswordDto) body: ResetPasswordDto): Promise<NeutralDto> {
    await this.auth.reset(body.email, body.code, body.password);
    return NEUTRAL;
  }
  @AnyAuthenticated()
  @Post('password/change')
  @HttpCode(HttpStatus.OK)
  @ApiEnvelope(NeutralDto)
  public async change(
    @ValidatedBody(ChangePasswordDto) body: ChangePasswordDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<NeutralDto> {
    await this.auth.change(request.session, body.currentPassword, body.password);
    return NEUTRAL;
  }
  @AnyAuthenticated()
  @Get('me')
  @ApiEnvelope(MeDto)
  public me(@Req() request: AuthenticatedRequest): PermissionContext {
    return request.authContext;
  }
}
function metadata(request: Request): RequestMetadata {
  return {
    ip: request.ip ?? request.socket.remoteAddress ?? '',
    userAgent: (request.get('user-agent') ?? '').slice(0, USER_AGENT_MAX),
  };
}
function refreshCookie(request: Request): string {
  const cookies = request.cookies as Record<string, string> | undefined;
  const token = cookies?.[COOKIE_NAMES.REFRESH];
  if (!token) throw new AppException(ErrorCode.UNAUTHORIZED);
  return token;
}
const USER_AGENT_MAX = 1000;
