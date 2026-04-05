import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdminAuditLogs1743862800000 implements MigrationInterface {
  name = 'AddAdminAuditLogs1743862800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "admin_audit_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "actor_user_id" uuid,
        "action" character varying(100) NOT NULL,
        "target_type" character varying(50) NOT NULL,
        "target_id" character varying(100),
        "reason" text,
        "before_state" jsonb,
        "after_state" jsonb,
        "metadata" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_admin_audit_logs_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "admin_audit_logs"
      ADD CONSTRAINT "FK_admin_audit_logs_actor_user"
      FOREIGN KEY ("actor_user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_admin_audit_logs_actor_user_id"
      ON "admin_audit_logs" ("actor_user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_admin_audit_logs_actor_user_id"',
    );
    await queryRunner.query(`
      ALTER TABLE "admin_audit_logs"
      DROP CONSTRAINT IF EXISTS "FK_admin_audit_logs_actor_user"
    `);
    await queryRunner.query('DROP TABLE IF EXISTS "admin_audit_logs"');
  }
}
