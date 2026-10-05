import { randomUUID } from 'node:crypto';
import { IdentityFixture, ORIGIN, type FixtureAccount } from './identity-fixture';
import { PROPERTY_TYPE as T } from '../../shared/property.constants';
import { ROLE, SCOPE, IDENTITY_TTL } from '../../shared/identity.constants';
import type { PropertyRecord, PropertyType, InviteView } from '../../shared/property.types';
import { KeyValueStore } from '../../core/redis/key-value-store.contract';
import { CACHE_KEYS, CONFIG_DEFAULTS } from '../../core/config/config.constants';
export const PROPERTY_INPUT = {
  name: 'Fixture house',
  type: T.HOTEL,
  addressLine1: '12 Fixture Road',
  city: 'Jaipur',
  state: 'Rajasthan',
  postalCode: '302001',
};
export class PropertyFixture extends IdentityFixture {
  public async resetDomains(): Promise<void> {
    await this.resetThrottle();
    const store = this.app.get(KeyValueStore);
    const window = Math.floor(Date.now() / IDENTITY_TTL.RESEND);
    for (const ip of ['127.0.0.1', '::ffff:127.0.0.1', '::1']) {
      await store.delete('auth:throttle:/api/v1/invitations/accept:' + ip + ':' + String(window));
      await store.delete(
        CACHE_KEYS.throttle(ip, Math.floor(Date.now() / CONFIG_DEFAULTS.THROTTLE_WINDOW_MS)),
      );
    }
  }
  public async property(
    owner: FixtureAccount,
    type: PropertyType = T.HOTEL,
  ): Promise<PropertyRecord> {
    const response = await this.http()
      .post('/api/v1/properties')
      .set('Cookie', owner.cookies)
      .set('Origin', ORIGIN)
      .send({ ...PROPERTY_INPUT, type, name: 'Property ' + randomUUID() })
      .expect(201);
    return (response.body as { data: PropertyRecord }).data;
  }
  public async scoped(owner: FixtureAccount, propertyId: string): Promise<FixtureAccount> {
    const user = await this.member(owner, ROLE.MANAGER);
    const assignment = user.me.roles.find((r) => r.role === ROLE.MANAGER);
    if (!assignment) throw new Error('Fixture assignment missing');
    await this.http()
      .delete('/api/v1/users/' + user.me.user.id + '/roles/' + assignment.id)
      .set('Cookie', owner.cookies)
      .set('Origin', ORIGIN)
      .expect(200);
    await this.http()
      .post('/api/v1/users/' + user.me.user.id + '/roles')
      .set('Cookie', owner.cookies)
      .set('Origin', ORIGIN)
      .send({ role: ROLE.MANAGER, scope: SCOPE.PROPERTY, scopeId: propertyId })
      .expect(201);
    return user;
  }
  public async invite(
    owner: FixtureAccount,
    roleKey: string = ROLE.TENANT,
    scopeId?: string,
  ): Promise<{ record: InviteView; token: string; email: string }> {
    const email = 'invite-' + randomUUID() + '@fixture.rentmate.test';
    const response = await this.http()
      .post('/api/v1/invitations')
      .set('Cookie', owner.cookies)
      .set('Origin', ORIGIN)
      .send({
        email,
        roleKey,
        scopeType: scopeId ? SCOPE.PROPERTY : SCOPE.ORGANIZATION,
        ...(scopeId ? { scopeId } : {}),
      })
      .expect(201);
    expect(JSON.stringify(response.body)).not.toMatch(/tokenHash|token_hash|token=/);
    const sent = this.mail.sent.filter((m) => m.recipient === email).at(-1);
    const token = sent?.inviteUrl ? new URL(sent.inviteUrl).searchParams.get('token') : null;
    if (!token) throw new Error('Fixture invitation token missing');
    return { record: (response.body as { data: InviteView }).data, token, email };
  }
}
