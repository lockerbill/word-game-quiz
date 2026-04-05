import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContentRevisions1743870000000 implements MigrationInterface {
  name = 'AddContentRevisions1743870000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "content_revisions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "version" integer NOT NULL,
        "status" character varying(30) NOT NULL,
        "title" character varying(120) NOT NULL,
        "reason" text,
        "snapshot" jsonb NOT NULL,
        "created_by_user_id" uuid,
        "published_by_user_id" uuid,
        "published_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_content_revisions_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_content_revisions_version" UNIQUE ("version")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "content_revisions"
      ADD CONSTRAINT "FK_content_revisions_created_by_user"
      FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "content_revisions"
      ADD CONSTRAINT "FK_content_revisions_published_by_user"
      FOREIGN KEY ("published_by_user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_content_revisions_created_by_user_id"
      ON "content_revisions" ("created_by_user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_content_revisions_created_by_user_id"',
    );
    await queryRunner.query(`
      ALTER TABLE "content_revisions"
      DROP CONSTRAINT IF EXISTS "FK_content_revisions_published_by_user"
    `);
    await queryRunner.query(`
      ALTER TABLE "content_revisions"
      DROP CONSTRAINT IF EXISTS "FK_content_revisions_created_by_user"
    `);
    await queryRunner.query('DROP TABLE IF EXISTS "content_revisions"');
  }
}
