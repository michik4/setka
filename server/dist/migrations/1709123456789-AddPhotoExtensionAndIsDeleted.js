"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddPhotoExtensionAndIsDeleted1709123456789 = void 0;
class AddPhotoExtensionAndIsDeleted1709123456789 {
    async up(queryRunner) {
        // Добавляем колонку extension как nullable
        await queryRunner.query(`
            ALTER TABLE "photos" ADD COLUMN "extension" character varying;
        `);
        // Заполняем extension из originalName
        await queryRunner.query(`
            UPDATE "photos" 
            SET "extension" = SUBSTRING("originalName" FROM '\.[^.]+$')
            WHERE "extension" IS NULL;
        `);
        // Делаем extension NOT NULL
        await queryRunner.query(`
            ALTER TABLE "photos" ALTER COLUMN "extension" SET NOT NULL;
        `);
        // Добавляем колонку isDeleted
        await queryRunner.query(`
            ALTER TABLE "photos" ADD COLUMN "isDeleted" boolean NOT NULL DEFAULT false;
        `);
    }
    async down(queryRunner) {
        // Удаляем колонки в обратном порядке
        await queryRunner.query(`
            ALTER TABLE "photos" DROP COLUMN "isDeleted";
        `);
        await queryRunner.query(`
            ALTER TABLE "photos" DROP COLUMN "extension";
        `);
    }
}
exports.AddPhotoExtensionAndIsDeleted1709123456789 = AddPhotoExtensionAndIsDeleted1709123456789;
