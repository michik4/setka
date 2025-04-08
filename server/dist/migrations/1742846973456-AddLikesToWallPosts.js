"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddLikesToWallPosts1742846973456 = void 0;
class AddLikesToWallPosts1742846973456 {
    constructor() {
        this.name = 'AddLikesToWallPosts1742846973456';
    }
    async up(queryRunner) {
        // Добавляем поле likesCount в таблицу wall_posts
        await queryRunner.query(`
            ALTER TABLE "wall_posts"
            ADD COLUMN "likesCount" integer NOT NULL DEFAULT 0
        `);
        // Изменяем таблицу likes для поддержки wall_posts
        await queryRunner.query(`
            ALTER TABLE "likes"
            ADD COLUMN "wallPostId" integer,
            ADD CONSTRAINT "FK_likes_wall_post"
            FOREIGN KEY ("wallPostId")
            REFERENCES "wall_posts"("id")
            ON DELETE CASCADE
        `);
    }
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "likes" DROP CONSTRAINT IF EXISTS "FK_likes_wall_post"`);
        await queryRunner.query(`ALTER TABLE "likes" DROP COLUMN IF EXISTS "wallPostId"`);
        await queryRunner.query(`ALTER TABLE "wall_posts" DROP COLUMN IF EXISTS "likesCount"`);
    }
}
exports.AddLikesToWallPosts1742846973456 = AddLikesToWallPosts1742846973456;
