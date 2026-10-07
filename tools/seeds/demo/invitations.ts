import { randomBytes, createHash } from 'node:crypto';
import { InvitationEntity } from '../../../src/modules/organizations/invitation.entity';
import { ROLE, SCOPE } from '../../../src/shared/identity.constants';
import { INVITE_STATUS } from '../../../src/shared/property.constants';
import { DEMO } from './catalog';
import { ensure, required, type DemoContext } from './context';
export async function seedInvitations(context: DemoContext): Promise<void> {
  for (const [index, status] of Object.values(INVITE_STATUS).entries()) {
    const propertyId = required(context.properties.get('hotel')).id;
    await ensure(context, InvitationEntity, 'invite:' + status, {
      organizationId: context.orgId,
      email: 'invite.' + status.toLowerCase() + '@' + DEMO.domain,
      roleId: ROLE.MANAGER,
      scopeType: SCOPE.PROPERTY,
      scopeId: propertyId,
      propertyId,
      tokenHash: createHash('sha256').update(randomBytes(32)).digest('hex'),
      status,
      expiresAt: new Date(context.today.getTime() + (index === 3 ? -1 : 7) * DEMO.day),
      invitedBy: required(context.users.get(ROLE.OWNER)).id,
      locale: 'en',
    });
  }
}
