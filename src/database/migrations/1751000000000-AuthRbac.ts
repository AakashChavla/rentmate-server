import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Auth, RBAC, and the minimal organization/user tables.
 * Unique role assignments ignore soft-deleted rows so a removed grant can be added again.
 */
export class AuthRbac1751000000000 implements MigrationInterface {
  name = 'AuthRbac1751000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "organization_plan" AS ENUM ('FREE', 'STARTER', 'PRO', 'ENTERPRISE')`,
    );
    await queryRunner.query(`CREATE TYPE "user_status" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED')`);
    await queryRunner.query(
      `CREATE TYPE "assignment_scope_type" AS ENUM ('ORGANIZATION', 'PROPERTY')`,
    );
    await queryRunner.query(
      `CREATE TYPE "otp_purpose" AS ENUM ('LOGIN', 'PASSWORD_RESET', 'EMAIL_VERIFICATION')`,
    );

    await queryRunner.query(`
      CREATE TABLE "organizations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "name" character varying(200) NOT NULL,
        "slug" character varying(120) NOT NULL,
        "timezone" character varying(64) NOT NULL DEFAULT 'Asia/Kolkata',
        "settings" jsonb NOT NULL DEFAULT '{}',
        "plan" "organization_plan" NOT NULL DEFAULT 'FREE',
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_organizations" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "organizations_slug_unique" ON "organizations" ("slug")`,
    );

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "organization_id" uuid NOT NULL,
        "email" character varying(320) NOT NULL,
        "password_hash" character varying(255),
        "full_name" character varying(200) NOT NULL,
        "phone" character varying(32),
        "status" "user_status" NOT NULL DEFAULT 'INVITED',
        "email_verified_at" TIMESTAMP WITH TIME ZONE,
        "last_login_at" TIMESTAMP WITH TIME ZONE,
        "failed_login_count" integer NOT NULL DEFAULT 0,
        "locked_until" TIMESTAMP WITH TIME ZONE,
        "is_platform_admin" boolean NOT NULL DEFAULT false,
        "notification_preferences" jsonb NOT NULL DEFAULT '{}',
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "FK_users_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "users_email_unique" ON "users" ("email")`);
    await queryRunner.query(
      `CREATE INDEX "users_organization_id_idx" ON "users" ("organization_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "users_organization_id_created_at_id_idx" ON "users" ("organization_id", "created_at", "id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "key" character varying(64) NOT NULL,
        "name" character varying(120) NOT NULL,
        "description" character varying(400) NOT NULL,
        "is_system" boolean NOT NULL DEFAULT false,
        "organization_id" uuid,
        CONSTRAINT "PK_roles" PRIMARY KEY ("id"),
        CONSTRAINT "FK_roles_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "roles_key_unique" ON "roles" ("key")`);

    await queryRunner.query(`
      CREATE TABLE "permissions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "key" character varying(128) NOT NULL,
        "resource" character varying(64) NOT NULL,
        "action" character varying(64) NOT NULL,
        "description" character varying(400) NOT NULL,
        CONSTRAINT "PK_permissions" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "permissions_key_unique" ON "permissions" ("key")`,
    );

    await queryRunner.query(`
      CREATE TABLE "role_permissions" (
        "role_id" uuid NOT NULL,
        "permission_id" uuid NOT NULL,
        CONSTRAINT "PK_role_permissions" PRIMARY KEY ("role_id", "permission_id"),
        CONSTRAINT "FK_role_permissions_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_role_permissions_permission" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "user_role_assignments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "organization_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "role_id" uuid NOT NULL,
        "scope_type" "assignment_scope_type" NOT NULL,
        "scope_id" uuid NOT NULL,
        "assigned_by" uuid,
        "expires_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_user_role_assignments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_role_assignments_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_user_role_assignments_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_role_assignments_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_user_role_assignments_assigned_by" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "user_role_assignments_organization_id_idx" ON "user_role_assignments" ("organization_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "user_role_assignments_organization_id_user_id_idx" ON "user_role_assignments" ("organization_id", "user_id")`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX "user_role_assignments_identity_unique"
      ON "user_role_assignments" ("user_id", "role_id", "scope_type", "scope_id")
      WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "organization_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "family_id" uuid NOT NULL,
        "token_hash" character varying(64) NOT NULL,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "revoked_at" TIMESTAMP WITH TIME ZONE,
        "replaced_by_id" uuid,
        "user_agent" character varying(512),
        "ip" character varying(64),
        CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "FK_refresh_tokens_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_refresh_tokens_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "refresh_tokens_organization_id_idx" ON "refresh_tokens" ("organization_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "refresh_tokens_organization_id_user_id_idx" ON "refresh_tokens" ("organization_id", "user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "refresh_tokens_family_id_idx" ON "refresh_tokens" ("family_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens" ("user_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "otp_verifications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "organization_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "purpose" "otp_purpose" NOT NULL,
        "code_hash" character varying(64) NOT NULL,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "attempts" integer NOT NULL DEFAULT 0,
        "consumed_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_otp_verifications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_otp_verifications_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_otp_verifications_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "otp_verifications_organization_id_idx" ON "otp_verifications" ("organization_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "otp_verifications_organization_id_user_id_purpose_idx" ON "otp_verifications" ("organization_id", "user_id", "purpose")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "otp_verifications"`);
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE "user_role_assignments"`);
    await queryRunner.query(`DROP TABLE "role_permissions"`);
    await queryRunner.query(`DROP TABLE "permissions"`);
    await queryRunner.query(`DROP TABLE "roles"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "organizations"`);
    await queryRunner.query(`DROP TYPE "otp_purpose"`);
    await queryRunner.query(`DROP TYPE "assignment_scope_type"`);
    await queryRunner.query(`DROP TYPE "user_status"`);
    await queryRunner.query(`DROP TYPE "organization_plan"`);
  }
}
