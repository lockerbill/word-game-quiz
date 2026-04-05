import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdminSettingsRevisions1743873600000 implements MigrationInterface {
  name = 'AddAdminSettingsRevisions1743873600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "admin_settings_revisions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "version" integer NOT NULL,
        "settings" jsonb NOT NULL,
        "reason" text NOT NULL,
        "created_by_user_id" uuid,
        "published_by_user_id" uuid,
        "rollback_from_revision_id" uuid,
        "published_at" TIMESTAMP NOT NULL DEFAULT now(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_admin_settings_revisions_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_admin_settings_revisions_version" UNIQUE ("version")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "admin_settings_revisions"
      ADD CONSTRAINT "FK_admin_settings_revisions_created_by_user"
      FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "admin_settings_revisions"
      ADD CONSTRAINT "FK_admin_settings_revisions_published_by_user"
      FOREIGN KEY ("published_by_user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "admin_settings_revisions"
      ADD CONSTRAINT "FK_admin_settings_revisions_rollback_from"
      FOREIGN KEY ("rollback_from_revision_id") REFERENCES "admin_settings_revisions"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_admin_settings_revisions_created_by_user_id"
      ON "admin_settings_revisions" ("created_by_user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_admin_settings_revisions_created_by_user_id"',
    );
    await queryRunner.query(`
      ALTER TABLE "admin_settings_revisions"
      DROP CONSTRAINT IF EXISTS "FK_admin_settings_revisions_rollback_from"
    `);
    await queryRunner.query(`
      ALTER TABLE "admin_settings_revisions"
      DROP CONSTRAINT IF EXISTS "FK_admin_settings_revisions_published_by_user"
    `);
    await queryRunner.query(`
      ALTER TABLE "admin_settings_revisions"
      DROP CONSTRAINT IF EXISTS "FK_admin_settings_revisions_created_by_user"
    `);
    await queryRunner.query('DROP TABLE IF EXISTS "admin_settings_revisions"');
  }
}
