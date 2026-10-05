import { Inject, Injectable } from '@nestjs/common';
import { SignJWT, jwtVerify } from 'jose';
import { TokenSigner } from '../../token-signer.contract';
import { AppConfig } from '../../../../core/config/app-config.contract';
import { AppException } from '../../../../core/errors/app-exception';
import { ErrorCode } from '../../../../core/errors/error-code.constants';
import { JWT_IDENTITY as J, IDENTITY_TTL as T } from '../../../../shared/identity.constants';
import type { SessionClaims } from '../../../../shared/identity.types';
@Injectable()
export class JoseTokenSigner extends TokenSigner {
  public constructor(@Inject(AppConfig) private readonly config: AppConfig) {
    super();
  }
  private key(refresh: boolean): Uint8Array {
    return new TextEncoder().encode(
      this.config.get(refresh ? 'JWT_REFRESH_SECRET' : 'JWT_ACCESS_SECRET'),
    );
  }
  public override sign(claims: Omit<SessionClaims, 'iat'>, refresh: boolean): Promise<string> {
    return new SignJWT({ ...claims })
      .setProtectedHeader({ alg: J.ALGORITHM })
      .setIssuer(J.ISSUER)
      .setAudience(refresh ? J.REFRESH_AUDIENCE : J.ACCESS_AUDIENCE)
      .setIssuedAt(Date.now() / T.MILLISECONDS)
      .setExpirationTime((Date.now() + (refresh ? T.REFRESH : T.ACCESS)) / T.MILLISECONDS)
      .sign(this.key(refresh));
  }
  public override async verify(token: string, refresh: boolean): Promise<SessionClaims> {
    try {
      const { payload } = await jwtVerify(token, this.key(refresh), {
        algorithms: [J.ALGORITHM],
        issuer: J.ISSUER,
        audience: refresh ? J.REFRESH_AUDIENCE : J.ACCESS_AUDIENCE,
      });
      if (
        typeof payload.sub !== 'string' ||
        typeof payload.org !== 'string' ||
        typeof payload.fid !== 'string' ||
        typeof payload.iat !== 'number' ||
        (refresh && typeof payload.jti !== 'string')
      )
        throw new AppException(ErrorCode.UNAUTHORIZED);
      return {
        sub: payload.sub,
        org: payload.org,
        fid: payload.fid,
        iat: payload.iat,
        ...(typeof payload.jti === 'string' ? { jti: payload.jti } : {}),
      };
    } catch {
      throw new AppException(ErrorCode.UNAUTHORIZED);
    }
  }
}
