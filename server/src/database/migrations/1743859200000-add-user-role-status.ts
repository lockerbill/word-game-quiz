import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserRoleStatus1743859200000 implements MigrationInterface {
  name = 'AddUserRoleStatus1743859200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" character varying(20) NOT NULL DEFAULT 'player'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "account_status" character varying(20) NOT NULL DEFAULT 'active'`,
    );
    await queryRunner.query(
      `UPDATE "users" SET "role" = 'player' WHERE "role" IS NULL OR "role" = ''`,
    );
    await queryRunner.query(
      `UPDATE "users" SET "account_status" = 'active' WHERE "account_status" IS NULL OR "account_status" = ''`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "account_status"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "role"`);
  }
}
