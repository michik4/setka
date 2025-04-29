import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCommentsTable1742847180000 implements MigrationInterface {
    name = 'CreateCommentsTable1742847180000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Создание таблицы комментариев
        await queryRunner.query(`
            CREATE TABLE "comments" (
                "id" SERIAL NOT NULL,
                "content" text NOT NULL,
                "postId" integer NOT NULL,
                "authorId" integer NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_comments_id" PRIMARY KEY ("id")
            )
        `);

        // Добавление внешних ключей
        await queryRunner.query(`
            ALTER TABLE "comments"
            ADD CONSTRAINT "FK_comments_author"
            FOREIGN KEY ("authorId") REFERENCES "users"("id")
            ON DELETE CASCADE
            ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "comments"
            ADD CONSTRAINT "FK_comments_post"
            FOREIGN KEY ("postId") REFERENCES "posts"("id")
            ON DELETE CASCADE
            ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Удаление внешних ключей
        await queryRunner.query(`ALTER TABLE "comments" DROP CONSTRAINT "FK_comments_post"`);
        await queryRunner.query(`ALTER TABLE "comments" DROP CONSTRAINT "FK_comments_author"`);
        
        // Удаление таблицы
        await queryRunner.query(`DROP TABLE "comments"`);
    }
} 