import { Controller, Get, type INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { TenantContext } from '../../../core/tenancy/tenant-context';
import { ErrorCode } from '../../../core/errors/error-codes';
import { RequirePermissions } from '../../../core/http/decorators/require-permissions.decorator';
import { RequestIdMiddleware } from '../../../core/http/middleware/request-id.middleware';
import { CookieName } from '../../../shared/auth-cookies';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { PermissionService } from '../services/permission.service';
import { TokenService } from '../../auth/services/token.service';

@Controller('probe')
class ProbeController {
  @Get('context')
  context() {
    return {
      organizationId: TenantContext.getOrganizationId() ?? null,
      userId: TenantContext.getUserId() ?? null,
    };
  }

  @Get('secret')
  @RequirePermissions('user:read')
  secret() {
    return { ok: true };
  }
}

describe('auth guards', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProbeController],
      providers: [
        JwtAuthGuard,
        PermissionsGuard,
        { provide: APP_GUARD, useExisting: JwtAuthGuard },
        { provide: APP_GUARD, useExisting: PermissionsGuard },
        {
          provide: TokenService,
          useValue: {
            verifyAccess: async () => ({ sub: 'user-1', org: 'org-1', fid: 'family-1' }),
          },
        },
        {
          provide: PermissionService,
          useValue: {
            getProfile: async () => ({
              user: {
                id: 'user-1',
                email: 'owner@rentmate.local',
                fullName: 'Owner',
                status: 'ACTIVE',
                organizationId: 'org-1',
              },
              organization: {
                id: 'org-1',
                name: 'Org',
                slug: 'org',
                timezone: 'Asia/Kolkata',
                plan: 'FREE',
              },
              roles: [],
              permissions: ['user:read'],
              isPlatformAdmin: false,
              grants: [
                {
                  roleKey: 'ORG_OWNER',
                  permissions: ['user:read'],
                  scopeType: 'ORGANIZATION',
                  scopeId: 'org-1',
                  expiresAt: null,
                },
              ],
            }),
            holds: (_user: unknown, permission: string) => permission === 'user:read',
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    const middleware = new RequestIdMiddleware();
    app.use((req: Request, res: Response, next: NextFunction) => middleware.use(req, res, next));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('exposes the verified identity inside a controller', async () => {
    const response = await request(app.getHttpServer())
      .get('/probe/context')
      .set('Cookie', `${CookieName.Access}=signed-token`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ organizationId: 'org-1', userId: 'user-1' });
  });

  it('rejects a protected route without a session', async () => {
    const response = await request(app.getHttpServer()).get('/probe/secret');

    expect(response.status).toBe(401);
    expect(response.body.code ?? response.body.error?.code).toBe(ErrorCode.UNAUTHORIZED);
  });

  it('allows a permission the caller holds', async () => {
    const response = await request(app.getHttpServer())
      .get('/probe/secret')
      .set('Cookie', `${CookieName.Access}=signed-token`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });
});
