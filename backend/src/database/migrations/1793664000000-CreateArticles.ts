import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateArticles1793664000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "article" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      "slug" varchar NOT NULL, "title" varchar NOT NULL, "summary" varchar NOT NULL,
      "markdown" text NOT NULL, "tags" text[] NOT NULL DEFAULT '{}', "author" varchar NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_article_slug" UNIQUE ("slug")
    )`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "article"');
  }
}
