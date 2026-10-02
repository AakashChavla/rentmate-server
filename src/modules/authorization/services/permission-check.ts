import type { AuthenticatedUser } from '../../../core/http/decorators/current-user.decorator';

export interface ResourceCheck {
  propertyId?: string;
}

export function holdsPermission(
  user: AuthenticatedUser,
  permission: string,
  now = new Date(),
): boolean {
  return user.grants.some(
    (grant) => !isExpired(grant.expiresAt, now) && grant.permissions.includes(permission),
  );
}

/**
 * Organization-scoped grants apply everywhere in that organization.
 * Property-scoped grants apply only when the resource property id matches.
 */
export function canAccess(
  user: AuthenticatedUser,
  permission: string,
  options: ResourceCheck = {},
  now = new Date(),
): boolean {
  return user.grants.some((grant) => {
    if (isExpired(grant.expiresAt, now) || !grant.permissions.includes(permission)) {
      return false;
    }

    if (grant.scopeType === 'ORGANIZATION') {
      return grant.scopeId === user.organizationId;
    }

    return Boolean(options.propertyId) && grant.scopeId === options.propertyId;
  });
}

function isExpired(expiresAt: string | null, now: Date): boolean {
  if (!expiresAt) {
    return false;
  }

  return Date.parse(expiresAt) <= now.getTime();
}
