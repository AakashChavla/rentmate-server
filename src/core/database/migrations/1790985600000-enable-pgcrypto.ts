import type { MigrationInterface, QueryRunner } from 'typeorm';
export class EnablePgcrypto1790985600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
  }
  public async down(): Promise<void> {
    /* Shared extension must survive rollback of this application. */
  }
}
