import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContentImportJobs1743866400000 implements MigrationInterface {
  name = 'AddContentImportJobs1743866400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "content_import_jobs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_by_user_id" uuid,
        "status" character varying(30) NOT NULL,
        "format" character varying(10) NOT NULL,
        "dry_run" boolean NOT NULL DEFAULT true,
        "reason" text,
        "source_payload" text NOT NULL,
        "summary" jsonb NOT NULL,
        "validation_errors" jsonb,
        "validation_warnings" jsonb,
        "apply_result" jsonb,
        "applied_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_content_import_jobs_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "content_import_jobs"
      ADD CONSTRAINT "FK_content_import_jobs_created_by_user"
      FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_content_import_jobs_created_by_user_id"
      ON "content_import_jobs" ("created_by_user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_content_import_jobs_created_by_user_id"',
    );
    await queryRunner.query(`
      ALTER TABLE "content_import_jobs"
      DROP CONSTRAINT IF EXISTS "FK_content_import_jobs_created_by_user"
    `);
    await queryRunner.query('DROP TABLE IF EXISTS "content_import_jobs"');
  }
}
