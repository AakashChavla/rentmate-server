import {
  ROLE,
  PERMISSION_ACTIONS,
  PERMISSION_RESOURCES,
} from '../../src/shared/identity.constants';
export const PERMISSIONS = PERMISSION_RESOURCES.flatMap((resource) =>
  PERMISSION_ACTIONS.map((action) => `${resource}:${action}`),
);
const READ = 'read';
const ROLE_RESOURCES: Record<string, string[]> = {
  [ROLE.MANAGER]: [
    'organization',
    'user',
    'role',
    'property',
    'unit',
    'tenant',
    'lease',
    'invoice',
    'payment',
    'expense',
    'complaint',
    'visitor',
    'notification',
    'report',
  ],
  [ROLE.ACCOUNTANT]: ['invoice', 'payment', 'expense', 'report', 'lease', 'tenant'],
  [ROLE.RECEPTIONIST]: ['tenant', 'visitor', 'complaint', 'unit'],
  [ROLE.MAINTENANCE]: ['complaint', 'property', 'unit'],
  [ROLE.SECURITY]: ['visitor', 'complaint'],
  [ROLE.TENANT]: ['tenant', 'lease', 'invoice', 'payment', 'complaint', 'visitor', 'notification'],
};
export function rolePermissions(role: string): string[] {
  if (role === ROLE.SUPER_ADMIN) return PERMISSIONS;
  if (role === ROLE.OWNER) return PERMISSIONS.filter((p) => !p.startsWith('platform:'));
  return PERMISSIONS.filter((permission) => {
    const [resource, action] = permission.split(':');
    return (
      !!resource &&
      !!ROLE_RESOURCES[role]?.includes(resource) &&
      allowedAction(role, resource, action)
    );
  });
}
function allowedAction(role: string, resource: string, action: string | undefined): boolean {
  return (
    action === READ ||
    (resource === 'complaint' && action === 'create') ||
    ([ROLE.MANAGER, ROLE.ACCOUNTANT, ROLE.RECEPTIONIST, ROLE.MAINTENANCE, ROLE.SECURITY].includes(
      role as typeof ROLE.MANAGER,
    ) &&
      !['user', 'role', 'organization'].includes(resource) &&
      action !== 'assign')
  );
}
export function seedStatements(): { query: string; parameters: string[] }[] {
  return [
    ...Object.values(ROLE).map((role) => ({
      query: 'INSERT INTO roles(name) VALUES($1) ON CONFLICT DO NOTHING',
      parameters: [role],
    })),
    ...PERMISSIONS.map((permission) => ({
      query: 'INSERT INTO permissions(name) VALUES($1) ON CONFLICT DO NOTHING',
      parameters: [permission],
    })),
    ...Object.values(ROLE).flatMap((role) =>
      rolePermissions(role).map((permission) => ({
        query: 'INSERT INTO role_permissions(role,permission) VALUES($1,$2) ON CONFLICT DO NOTHING',
        parameters: [role, permission],
      })),
    ),
  ];
}
