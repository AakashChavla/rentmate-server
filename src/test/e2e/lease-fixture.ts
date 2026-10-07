import { randomUUID } from 'node:crypto';
import { PropertyFixture } from './property-fixture';
import { ORIGIN, type FixtureAccount } from './identity-fixture';
import type { TenantView, DocumentView, LeaseInput, LeaseView } from '../../shared/lease.types';
import type { UnitRecord } from '../../shared/unit.types';
import { DatabaseConnection } from '../../core/database/database-connection.contract';
export function data<T>(response: { body: { data: T } }): T {
  return response.body.data;
}
export class LeaseFixture extends PropertyFixture {
  public override async close(): Promise<void> {
    try {
      for (const org of this.orgs)
        await this.app
          .get(DatabaseConnection)
          .withManager((m) => m.query('DELETE FROM tenants WHERE organization_id=$1', [org]));
    } finally {
      await super.close();
    }
  }
  public post(
    account: FixtureAccount,
    path: string,
    input: object,
  ): ReturnType<ReturnType<typeof this.http>['post']> {
    return this.http()
      .post('/api/v1/' + path)
      .set('Cookie', account.cookies)
      .set('Origin', ORIGIN)
      .send(input);
  }
  public get(
    account: FixtureAccount,
    path: string,
  ): ReturnType<ReturnType<typeof this.http>['get']> {
    return this.http()
      .get('/api/v1/' + path)
      .set('Cookie', account.cookies);
  }
  public async tenant(
    account: FixtureAccount,
    propertyId: string,
    email?: string,
  ): Promise<TenantView> {
    return data<TenantView>(
      await this.post(account, 'tenants', {
        propertyId,
        fullName: 'Tenant One',
        phone: '9876543210',
        email: email ?? randomUUID() + '@fixture.rentmate.test',
        idNumber: '123456789012',
      }).expect(201),
    );
  }
  public async upload(
    account: FixtureAccount,
    id: string,
    content = Buffer.from('%PDF-1.7 fixture'),
    mime = 'application/pdf',
  ): Promise<DocumentView> {
    return data<DocumentView>(
      await this.http()
        .post('/api/v1/tenants/' + id + '/documents/AADHAAR')
        .set('Cookie', account.cookies)
        .set('Origin', ORIGIN)
        .attach('file', content, { filename: 'document.pdf', contentType: mime })
        .expect(201),
    );
  }
  public async verify(account: FixtureAccount, tenant: TenantView): Promise<void> {
    const doc = await this.upload(account, tenant.id);
    await this.post(account, 'documents/' + doc.id + '/review', { status: 'VERIFIED' }).expect(201);
    await this.post(account, 'tenants/' + tenant.id + '/review', { status: 'VERIFIED' }).expect(
      201,
    );
  }
  public async room(account: FixtureAccount, property: string): Promise<UnitRecord> {
    return data<UnitRecord>(
      await this.post(account, 'properties/' + property + '/units', {
        code: randomUUID(),
        type: 'ROOM',
        baseRent: '1000.00',
        capacity: 2,
      }).expect(201),
    );
  }
  public input(tenant: string, unit: string, bed?: string): LeaseInput {
    return {
      tenantId: tenant,
      unitId: unit,
      ...(bed ? { bedId: bed } : {}),
      startDate: '2026-01-01',
      endDate: '2027-01-01',
      rent: '12500.50',
      deposit: '25000.00',
      dueDay: 5,
      members: [],
    };
  }
  public async lease(account: FixtureAccount, input: LeaseInput): Promise<LeaseView> {
    return data<LeaseView>(await this.post(account, 'leases', input).expect(201));
  }
}
