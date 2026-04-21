import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSessionModerationReviews1743877200000 implements MigrationInterface {
  name = 'AddSessionModerationReviews1743877200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "session_moderation_reviews" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "game_id" uuid NOT NULL,
        "reviewer_user_id" uuid,
        "decision" character varying(20) NOT NULL,
        "reason" text NOT NULL,
        "metadata" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_session_moderation_reviews_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "session_moderation_reviews"
      ADD CONSTRAINT "FK_session_moderation_reviews_game"
      FOREIGN KEY ("game_id") REFERENCES "games"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "session_moderation_reviews"
      ADD CONSTRAINT "FK_session_moderation_reviews_reviewer_user"
      FOREIGN KEY ("reviewer_user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_session_moderation_reviews_game_id"
      ON "session_moderation_reviews" ("game_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_session_moderation_reviews_reviewer_user_id"
      ON "session_moderation_reviews" ("reviewer_user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_session_moderation_reviews_created_at"
      ON "session_moderation_reviews" ("created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_session_moderation_reviews_created_at"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_session_moderation_reviews_reviewer_user_id"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_session_moderation_reviews_game_id"',
    );
    await queryRunner.query(`
      ALTER TABLE "session_moderation_reviews"
      DROP CONSTRAINT IF EXISTS "FK_session_moderation_reviews_reviewer_user"
    `);
    await queryRunner.query(`
      ALTER TABLE "session_moderation_reviews"
      DROP CONSTRAINT IF EXISTS "FK_session_moderation_reviews_game"
    `);
    await queryRunner.query(
      'DROP TABLE IF EXISTS "session_moderation_reviews"',
    );
  }
}
