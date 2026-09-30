export interface PermissionDefinition {
  key: string;
  resource: string;
  action: string;
  description: string;
}

const RESOURCES = [
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
  'audit',
] as const;

const ACTIONS: Record<(typeof RESOURCES)[number], readonly string[]> = {
  organization: ['read', 'update'],
  user: ['read', 'update'],
  role: ['read', 'assign'],
  property: ['read', 'create', 'update', 'delete'],
  unit: ['read', 'create', 'update', 'delete'],
  tenant: ['read', 'create', 'update', 'delete'],
  lease: ['read', 'create', 'update', 'delete'],
  invoice: ['read', 'create', 'update', 'generate'],
  payment: ['read', 'create', 'update'],
  expense: ['read', 'create', 'update'],
  complaint: ['read', 'create', 'update'],
  visitor: ['read', 'create', 'update'],
  notification: ['read', 'update'],
  report: ['read', 'generate'],
  audit: ['read'],
};

function define(resource: string, action: string): PermissionDefinition {
  return {
    key: `${resource}:${action}`,
    resource,
    action,
    description: `Allows ${action} on ${resource}`,
  };
}

export const PLATFORM_PERMISSION = 'platform:*';

export const PERMISSIONS: readonly PermissionDefinition[] = [
  ...RESOURCES.flatMap((resource) => ACTIONS[resource].map((action) => define(resource, action))),
  {
    key: PLATFORM_PERMISSION,
    resource: 'platform',
    action: '*',
    description: 'Platform administration. Does not grant access to organization data.',
  },
];

export const PERMISSION_KEYS = PERMISSIONS.map((permission) => permission.key);

const ORG_PERMISSIONS = PERMISSION_KEYS.filter((key) => key !== PLATFORM_PERMISSION);

function keys(...selected: string[]): string[] {
  return selected;
}

export const ROLE_PERMISSIONS: Record<string, readonly string[]> = {
  SUPER_ADMIN: [PLATFORM_PERMISSION],
  ORG_OWNER: ORG_PERMISSIONS,
  PROPERTY_MANAGER: keys(
    'organization:read',
    'user:read',
    'property:read',
    'property:create',
    'property:update',
    'property:delete',
    'unit:read',
    'unit:create',
    'unit:update',
    'unit:delete',
    'tenant:read',
    'tenant:create',
    'tenant:update',
    'tenant:delete',
    'lease:read',
    'lease:create',
    'lease:update',
    'lease:delete',
    'complaint:read',
    'complaint:create',
    'complaint:update',
    'visitor:read',
    'visitor:create',
    'visitor:update',
    'notification:read',
    'report:read',
  ),
  ACCOUNTANT: keys(
    'organization:read',
    'invoice:read',
    'invoice:create',
    'invoice:update',
    'invoice:generate',
    'payment:read',
    'payment:create',
    'payment:update',
    'expense:read',
    'expense:create',
    'expense:update',
    'report:read',
    'report:generate',
  ),
  RECEPTIONIST: keys(
    'organization:read',
    'tenant:read',
    'visitor:read',
    'visitor:create',
    'visitor:update',
    'complaint:read',
    'notification:read',
  ),
  MAINTENANCE_STAFF: keys('complaint:read', 'complaint:create', 'complaint:update'),
  SECURITY_STAFF: keys('visitor:read', 'visitor:create', 'visitor:update'),
  TENANT: keys(
    'lease:read',
    'invoice:read',
    'complaint:read',
    'complaint:create',
    'visitor:read',
    'visitor:create',
  ),
};

export const ROLE_DEFINITIONS: readonly {
  key: string;
  name: string;
  description: string;
}[] = [
  {
    key: 'SUPER_ADMIN',
    name: 'Super admin',
    description: 'Platform operator. No automatic access to organization data.',
  },
  {
    key: 'ORG_OWNER',
    name: 'Organization owner',
    description: 'Full access inside one organization, including role assignment.',
  },
  {
    key: 'PROPERTY_MANAGER',
    name: 'Property manager',
    description: 'Operates properties, units, tenants, leases, complaints, and visitors.',
  },
  {
    key: 'ACCOUNTANT',
    name: 'Accountant',
    description: 'Invoices, payments, and expenses. Cannot manage tenants.',
  },
  {
    key: 'RECEPTIONIST',
    name: 'Receptionist',
    description: 'Front desk access to visitors and a read-only view of tenants.',
  },
  {
    key: 'MAINTENANCE_STAFF',
    name: 'Maintenance staff',
    description: 'Complaint handling only.',
  },
  {
    key: 'SECURITY_STAFF',
    name: 'Security staff',
    description: 'Visitor handling only.',
  },
  {
    key: 'TENANT',
    name: 'Tenant',
    description: 'Own lease, invoices, complaints, and visitors.',
  },
];
