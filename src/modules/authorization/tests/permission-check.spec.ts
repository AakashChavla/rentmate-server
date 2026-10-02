import type { AuthenticatedUser } from '../../../core/http/decorators/current-user.decorator';
import { canAccess, holdsPermission } from '../services/permission-check';

const user: AuthenticatedUser = {
  id: 'user-1',
  organizationId: 'org-1',
  sessionId: 'family-1',
  status: 'ACTIVE',
  isPlatformAdmin: false,
  grants: [
    {
      roleKey: 'ORG_OWNER',
      permissions: ['user:read', 'invoice:generate'],
      scopeType: 'ORGANIZATION',
      scopeId: 'org-1',
      expiresAt: null,
    },
    {
      roleKey: 'PROPERTY_MANAGER',
      permissions: ['complaint:update'],
      scopeType: 'PROPERTY',
      scopeId: 'property-1',
      expiresAt: null,
    },
    {
      roleKey: 'ACCOUNTANT',
      permissions: ['payment:read'],
      scopeType: 'ORGANIZATION',
      scopeId: 'org-1',
      expiresAt: '2000-01-01T00:00:00.000Z',
    },
  ],
};

describe('permission checks', () => {
  it('allows an organization grant everywhere in the organization', () => {
    expect(canAccess(user, 'invoice:generate', { propertyId: 'property-9' })).toBe(true);
    expect(holdsPermission(user, 'user:read')).toBe(true);
  });

  it('limits a property grant to that property', () => {
    expect(canAccess(user, 'complaint:update', { propertyId: 'property-1' })).toBe(true);
    expect(canAccess(user, 'complaint:update', { propertyId: 'property-2' })).toBe(false);
    expect(canAccess(user, 'complaint:update')).toBe(false);
    expect(holdsPermission(user, 'complaint:update')).toBe(true);
  });

  it('ignores an expired assignment', () => {
    expect(canAccess(user, 'payment:read')).toBe(false);
    expect(holdsPermission(user, 'payment:read')).toBe(false);
  });
});
