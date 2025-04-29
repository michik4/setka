"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChangePhotoRelations1710000000003 = void 0;
class ChangePhotoRelations1710000000003 {
    constructor() {
        this.name = 'ChangePhotoRelations1710000000003';
    }
    async up(queryRunner) {
        // Создаем новую таблицу для связи many-to-many
        await queryRunner.query(`
            CREATE TABLE "wall_posts_photos" (
                "wallPostId" integer NOT NULL,
                "photoId" integer NOT NULL,
                CONSTRAINT "PK_wall_posts_photos" PRIMARY KEY ("wallPostId", "photoId")
            )
        `);
        // Добавляем внешние ключи
        await queryRunner.query(`
            ALTER TABLE "wall_posts_photos" 
            ADD CONSTRAINT "FK_wall_posts_photos_wall_post" 
            FOREIGN KEY ("wallPostId") 
            REFERENCES "wall_posts"("id") 
            ON DELETE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "wall_posts_photos" 
            ADD CONSTRAINT "FK_wall_posts_photos_photo" 
            FOREIGN KEY ("photoId") 
            REFERENCES "photos"("id") 
            ON DELETE CASCADE
        `);
        // Копируем существующие связи
        await queryRunner.query(`
            INSERT INTO wall_posts_photos ("wallPostId", "photoId")
            SELECT "wallPostId", "id"
            FROM "photos"
            WHERE "wallPostId" IS NOT NULL
        `);
        // Удаляем старую колонку
        await queryRunner.query(`ALTER TABLE "photos" DROP COLUMN "wallPostId"`);
    }
    async down(queryRunner) {
        // Добавляем колонку обратно
        await queryRunner.query(`ALTER TABLE "photos" ADD "wallPostId" integer`);
        // Копируем связи обратно
        await queryRunner.query(`
            UPDATE "photos" p
            SET "wallPostId" = wp."wallPostId"
            FROM "wall_posts_photos" wp
            WHERE p.id = wp."photoId"
        `);
        // Удаляем таблицу связей
        await queryRunner.query(`DROP TABLE "wall_posts_photos"`);
    }
}
exports.ChangePhotoRelations1710000000003 = ChangePhotoRelations1710000000003;
