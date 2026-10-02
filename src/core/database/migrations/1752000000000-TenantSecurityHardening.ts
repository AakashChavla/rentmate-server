import { MigrationInterface, QueryRunner } from 'typeorm';

export class TenantSecurityHardening1752000000000 implements MigrationInterface {
  name = 'TenantSecurityHardening1752000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Composite unique constraint on users (organization_id, id)
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "uq_users_organization_id_id" UNIQUE ("organization_id", "id");`,
    );

    // 2. Unique index on LOWER(email)
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_users_lower_email" ON "users" (LOWER("email"));`,
    );

    // 3. Composite foreign key on user_role_assignments (organization_id, user_id) -> users(organization_id, id)
    await queryRunner.query(
      `ALTER TABLE "user_role_assignments" ADD CONSTRAINT "fk_user_role_assignments_org_user" FOREIGN KEY ("organization_id", "user_id") REFERENCES "users"("organization_id", "id") ON DELETE CASCADE;`,
    );

    // 4. Composite foreign key on refresh_tokens (organization_id, user_id) -> users(organization_id, id)
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "fk_refresh_tokens_org_user" FOREIGN KEY ("organization_id", "user_id") REFERENCES "users"("organization_id", "id") ON DELETE CASCADE;`,
    );

    // 5. Composite foreign key on otp_verifications (organization_id, user_id) -> users(organization_id, id)
    await queryRunner.query(
      `ALTER TABLE "otp_verifications" ADD CONSTRAINT "fk_otp_verifications_org_user" FOREIGN KEY ("organization_id", "user_id") REFERENCES "users"("organization_id", "id") ON DELETE CASCADE;`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "otp_verifications" DROP CONSTRAINT "fk_otp_verifications_org_user";`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT "fk_refresh_tokens_org_user";`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_role_assignments" DROP CONSTRAINT "fk_user_role_assignments_org_user";`,
    );
    await queryRunner.query(`DROP INDEX "idx_users_lower_email";`);
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "uq_users_organization_id_id";`);
  }
}
