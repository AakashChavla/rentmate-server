import 'reflect-metadata';
import type { DataSource, Repository } from 'typeorm';
import type { AppConfig } from '../../config/env.schema';
import { validateEnv } from '../../config/env.schema';
import { AppDataSource } from '../data-source';
import {
  PERMISSIONS,
  ROLE_DEFINITIONS,
  ROLE_PERMISSIONS,
} from '../../../modules/authorization/constants/permission-catalog';
import { Permission } from '../../../modules/authorization/entities/permission.entity';
import { RolePermission } from '../../../modules/authorization/entities/role-permission.entity';
import { Role, RoleKey } from '../../../modules/authorization/entities/role.entity';
import { ScopeType } from '../../../modules/authorization/types/scope-type';
import { UserRoleAssignment } from '../../../modules/authorization/entities/user-role-assignment.entity';
import {
  assertPasswordPolicy,
  argonOptionsFor,
  PasswordService,
} from '../../../modules/auth/services/password.service';
import {
  Organization,
  OrganizationPlan,
} from '../../../modules/organizations/entities/organization.entity';
import { User, UserStatus } from '../../../modules/users/entities/user.entity';

const DEMO_USERS: readonly { email: string; fullName: string; role: RoleKey }[] = [
  { email: 'demo@rentmate.local', fullName: 'Demo Owner', role: RoleKey.OrgOwner },
  {
    email: 'property-manager@rentmate.local',
    fullName: 'Demo Property Manager',
    role: RoleKey.PropertyManager,
  },
  { email: 'accountant@rentmate.local', fullName: 'Demo Accountant', role: RoleKey.Accountant },
  {
    email: 'receptionist@rentmate.local',
    fullName: 'Demo Receptionist',
    role: RoleKey.Receptionist,
  },
  {
    email: 'maintenance@rentmate.local',
    fullName: 'Demo Maintenance',
    role: RoleKey.MaintenanceStaff,
  },
  { email: 'security@rentmate.local', fullName: 'Demo Security', role: RoleKey.SecurityStaff },
  { email: 'tenant@rentmate.local', fullName: 'Demo Tenant', role: RoleKey.Tenant },
];

export async function seedDatabase(dataSource: DataSource, config: AppConfig): Promise<void> {
  if (!config.seedSuperAdminEmail || !config.seedSuperAdminPassword) {
    throw new Error('SEED_SUPER_ADMIN_EMAIL and SEED_SUPER_ADMIN_PASSWORD are required to seed');
  }

  assertPasswordPolicy(config.seedSuperAdminPassword);
  const passwords = new PasswordService(argonOptionsFor(config.nodeEnv));
  const organizations = dataSource.getRepository(Organization);
  const users = dataSource.getRepository(User);
  const roles = dataSource.getRepository(Role);
  const permissions = dataSource.getRepository(Permission);
  const rolePermissions = dataSource.getRepository(RolePermission);
  const assignments = dataSource.getRepository(UserRoleAssignment);

  const permissionIds = await upsertPermissions(permissions);
  const roleIds = await upsertRoles(roles);
  await syncRolePermissions(rolePermissions, roleIds, permissionIds);

  const platform = await upsertOrganization(organizations, {
    name: 'RentMate Platform',
    slug: 'platform',
    plan: OrganizationPlan.Enterprise,
  });
  await upsertUser(users, assignments, passwords, {
    organizationId: platform.id,
    email: config.seedSuperAdminEmail,
    password: config.seedSuperAdminPassword,
    fullName: 'Platform Admin',
    roleId: requiredRole(roleIds, RoleKey.SuperAdmin),
    isPlatformAdmin: true,
  });

  if (config.nodeEnv !== 'development') {
    return;
  }

  if (!config.seedDemoPassword) {
    throw new Error('SEED_DEMO_PASSWORD is required when seeding in development');
  }

  assertPasswordPolicy(config.seedDemoPassword);
  const demo = await upsertOrganization(organizations, {
    name: 'Demo Residences',
    slug: 'demo',
    plan: OrganizationPlan.Free,
  });
  for (const demoUser of DEMO_USERS) {
    await upsertUser(users, assignments, passwords, {
      organizationId: demo.id,
      email: demoUser.email,
      password: config.seedDemoPassword,
      fullName: demoUser.fullName,
      roleId: requiredRole(roleIds, demoUser.role),
      isPlatformAdmin: false,
    });
  }
}

async function upsertPermissions(repository: Repository<Permission>): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const definition of PERMISSIONS) {
    const existing = await repository.findOne({ where: { key: definition.key } });
    if (existing) {
      existing.resource = definition.resource;
      existing.action = definition.action;
      existing.description = definition.description;
      await repository.save(existing);
      ids.set(definition.key, existing.id);
      continue;
    }

    const created = await repository.save(repository.create(definition));
    ids.set(definition.key, created.id);
  }

  return ids;
}

async function upsertRoles(repository: Repository<Role>): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const definition of ROLE_DEFINITIONS) {
    const existing = await repository.findOne({ where: { key: definition.key } });
    if (existing) {
      existing.name = definition.name;
      existing.description = definition.description;
      existing.isSystem = true;
      existing.organizationId = null;
      await repository.save(existing);
      ids.set(definition.key, existing.id);
      continue;
    }

    const created = await repository.save(
      repository.create({
        ...definition,
        isSystem: true,
        organizationId: null,
      }),
    );
    ids.set(definition.key, created.id);
  }

  return ids;
}

async function syncRolePermissions(
  repository: Repository<RolePermission>,
  roleIds: Map<string, string>,
  permissionIds: Map<string, string>,
): Promise<void> {
  for (const [roleKey, permissionKeys] of Object.entries(ROLE_PERMISSIONS)) {
    const roleId = requiredRole(roleIds, roleKey);
    await repository.delete({ roleId });
    const keys = permissionKeys as readonly string[];
    const rows = keys.map((key) =>
      repository.create({
        roleId,
        permissionId: requiredRole(permissionIds, key),
      }),
    );
    if (rows.length > 0) {
      await repository.save(rows);
    }
  }
}

async function upsertOrganization(
  repository: Repository<Organization>,
  input: { name: string; slug: string; plan: OrganizationPlan },
): Promise<Organization> {
  const existing = await repository.findOne({ where: { slug: input.slug } });
  if (existing) {
    existing.name = input.name;
    existing.plan = input.plan;
    existing.isActive = true;
    return repository.save(existing);
  }

  return repository.save(
    repository.create({
      name: input.name,
      slug: input.slug,
      plan: input.plan,
      timezone: 'Asia/Kolkata',
      settings: {},
      isActive: true,
    }),
  );
}

async function upsertUser(
  users: Repository<User>,
  assignments: Repository<UserRoleAssignment>,
  passwords: PasswordService,
  input: {
    organizationId: string;
    email: string;
    password: string;
    fullName: string;
    roleId: string;
    isPlatformAdmin: boolean;
  },
): Promise<void> {
  const email = input.email.trim().toLowerCase();
  const passwordHash = await passwords.hash(input.password);
  let user = await users.findOne({ where: { email } });
  if (!user) {
    user = await users.save(
      users.create({
        organizationId: input.organizationId,
        email,
        passwordHash,
        fullName: input.fullName,
        phone: null,
        status: UserStatus.Active,
        emailVerifiedAt: new Date(),
        lastLoginAt: null,
        failedLoginCount: 0,
        lockedUntil: null,
        isPlatformAdmin: input.isPlatformAdmin,
        notificationPreferences: {},
      }),
    );
  } else {
    user.organizationId = input.organizationId;
    user.passwordHash = passwordHash;
    user.fullName = input.fullName;
    user.status = UserStatus.Active;
    user.isPlatformAdmin = input.isPlatformAdmin;
    user.emailVerifiedAt = user.emailVerifiedAt ?? new Date();
    await users.save(user);
  }

  const existing = await assignments.findOne({
    where: {
      userId: user.id,
      roleId: input.roleId,
      scopeType: ScopeType.Organization,
      scopeId: input.organizationId,
    },
  });
  if (!existing) {
    await assignments.save(
      assignments.create({
        organizationId: input.organizationId,
        userId: user.id,
        roleId: input.roleId,
        scopeType: ScopeType.Organization,
        scopeId: input.organizationId,
        assignedBy: null,
        expiresAt: null,
      }),
    );
  }
}

function requiredRole(ids: Map<string, string>, key: string): string {
  const id = ids.get(key);
  if (!id) {
    throw new Error(`Missing seeded key ${key}`);
  }

  return id;
}

async function main(): Promise<void> {
  const config = validateEnv(process.env);
  await AppDataSource.initialize();
  try {
    await seedDatabase(AppDataSource, config);
  } finally {
    await AppDataSource.destroy();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
