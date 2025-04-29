"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddLikes1742846973455 = void 0;
class AddLikes1742846973455 {
    constructor() {
        this.name = 'AddLikes1742846973455';
    }
    async up(queryRunner) {
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
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "likes" DROP CONSTRAINT IF EXISTS "FK_likes_post"`);
        await queryRunner.query(`ALTER TABLE "likes" DROP CONSTRAINT IF EXISTS "FK_likes_user"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "likes"`);
    }
}
exports.AddLikes1742846973455 = AddLikes1742846973455;
