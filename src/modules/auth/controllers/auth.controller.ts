import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AllowRefreshSession } from '../../../core/http/decorators/allow-refresh.decorator';
import { CurrentUser } from '../../../core/http/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../core/http/decorators/current-user.decorator';
import { Authenticated, Public } from '../../../core/http/decorators/public.decorator';
import { ApiAcceptedResponse, ApiDataResponse } from '../../../core/http/swagger/api-envelope';
import {
  buildAuthCookies,
  buildClearedAuthCookies,
  CookieName,
  readCookie,
} from '../../../shared/auth-cookies';
import { AppConfigService } from '../../../core/config/app-config.service';
import { AuthService, type MeResponse } from '../services/auth.service';
import {
  LoginDto,
  LogoutDto,
  MeResponseDto,
  OtpSendDto,
  OtpVerifyDto,
  PasswordChangeDto,
  PasswordChangedDto,
  PasswordForgotDto,
  PasswordResetDto,
} from '../dto/auth.dto';
import { OtpPurpose } from '../types/otp-purpose';
import type { ClientMeta, IssuedSession } from '../types/token.types';

@ApiTags('auth')
@Public()
@Throttle({ default: { limit: 10, ttl: 60_000 } })
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: AppConfigService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiDataResponse(MeResponseDto, 'Sets session cookies and returns the caller profile')
  async login(
    @Body() body: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<MeResponse> {
    const session = await this.auth.login(body.email, body.password, clientMeta(request));
    this.writeSession(response, session.tokens);
    return session.profile;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiDataResponse(MeResponseDto, 'Rotates the refresh cookie and returns the caller profile')
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<MeResponse> {
    const refreshToken = readCookie(request, CookieName.Refresh);
    const session = await this.auth.refresh(refreshToken ?? '', clientMeta(request));
    this.writeSession(response, session.tokens);
    return session.profile;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @Authenticated()
  @AllowRefreshSession()
  @ApiCookieAuth('rm_access')
  @ApiDataResponse(LogoutDto, 'Revokes the current session family and clears cookies')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ loggedOut: true }> {
    await this.auth.logout(
      readCookie(request, CookieName.Access),
      readCookie(request, CookieName.Refresh),
    );
    this.clearSession(response);
    return { loggedOut: true };
  }

  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  @ApiAcceptedResponse('Accepts the request without revealing whether the email exists')
  sendOtp(@Body() body: OtpSendDto): Promise<{ accepted: true }> {
    return this.auth.sendOtp(body.email, OtpPurpose.Login);
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiDataResponse(MeResponseDto, 'Verifies a login OTP and sets session cookies')
  async verifyOtp(
    @Body() body: OtpVerifyDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<MeResponse> {
    const session = await this.auth.verifyOtp(
      body.email,
      body.code,
      OtpPurpose.Login,
      clientMeta(request),
    );
    this.writeSession(response, session.tokens);
    return session.profile;
  }

  @Post('password/forgot')
  @HttpCode(HttpStatus.OK)
  @ApiAcceptedResponse('Accepts the request without revealing whether the email exists')
  forgotPassword(@Body() body: PasswordForgotDto): Promise<{ accepted: true }> {
    return this.auth.sendOtp(body.email, OtpPurpose.PasswordReset);
  }

  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  @ApiDataResponse(PasswordChangedDto, 'Sets a new password and revokes every session')
  resetPassword(@Body() body: PasswordResetDto): Promise<{ reset: true }> {
    return this.auth.resetPassword(body.email, body.code, body.newPassword);
  }

  @Post('password/change')
  @HttpCode(HttpStatus.OK)
  @Authenticated()
  @ApiCookieAuth('rm_access')
  @ApiDataResponse(PasswordChangedDto, 'Changes the password and revokes other sessions')
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: PasswordChangeDto,
  ): Promise<{ changed: true }> {
    return this.auth.changePassword(
      user.id,
      user.organizationId,
      user.sessionId,
      body.currentPassword,
      body.newPassword,
    );
  }

  @Get('me')
  @Authenticated()
  @ApiCookieAuth('rm_access')
  @ApiDataResponse(MeResponseDto, 'Returns the authenticated profile')
  me(@CurrentUser() user: AuthenticatedUser): Promise<MeResponse> {
    return this.auth.profileFor(user.id, user.organizationId);
  }

  private writeSession(response: Response, tokens: IssuedSession): void {
    const cookies = buildAuthCookies(this.cookieConfig(), {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessTtl: this.config.jwtAccessTtl,
      refreshTtl: this.config.jwtRefreshTtl,
    });
    for (const cookie of cookies) {
      response.cookie(cookie.name, cookie.value, cookie.options);
    }
  }

  private clearSession(response: Response): void {
    for (const cookie of buildClearedAuthCookies(this.cookieConfig())) {
      response.cookie(cookie.name, cookie.value, cookie.options);
    }
  }

  private cookieConfig(): { nodeEnv: string; cookieDomain?: string } {
    return { nodeEnv: this.config.nodeEnv, cookieDomain: this.config.cookieDomain };
  }
}

function clientMeta(request: Request): ClientMeta {
  const userAgent = request.get('user-agent') ?? null;
  return {
    userAgent: userAgent ? userAgent.slice(0, 512) : null,
    ip: request.ip ?? null,
  };
}
