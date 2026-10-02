export interface AccessTokenClaims {
  sub: string;
  org: string;
  fid: string;
}

export interface RefreshTokenClaims extends AccessTokenClaims {
  jti: string;
}

export interface ClientMeta {
  userAgent: string | null;
  ip: string | null;
}

export interface IssuedSession {
  accessToken: string;
  refreshToken: string;
  familyId: string;
}
