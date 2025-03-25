import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLikes1742846973455 implements MigrationInterface {
    name = 'AddLikes1742846973455'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Создаем таблицу лайков
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "likes" (
                "id" SERIAL NOT NULL,
                "userId" integer NOT NULL,
                "postId" integer NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_likes" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_user_post" UNIQUE ("userId", "postId")
            )
        `);

        // Добавляем внешние ключи
        await queryRunner.query(`
            ALTER TABLE "likes"
            ADD CONSTRAINT "FK_likes_user"
            FOREIGN KEY ("userId")
            REFERENCES "users"("id")
            ON DELETE CASCADE
        `);

        await queryRunner.query(`
            ALTER TABLE "likes"
            ADD CONSTRAINT "FK_likes_post"
            FOREIGN KEY ("postId")
            REFERENCES "posts"("id")
            ON DELETE CASCADE
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "likes" DROP CONSTRAINT IF EXISTS "FK_likes_post"`);
        await queryRunner.query(`ALTER TABLE "likes" DROP CONSTRAINT IF EXISTS "FK_likes_user"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "likes"`);
    }
} 