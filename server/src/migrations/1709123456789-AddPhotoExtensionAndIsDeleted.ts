import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPhotoExtensionAndIsDeleted1709123456789 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
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

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Удаляем колонки в обратном порядке
        await queryRunner.query(`
            ALTER TABLE "photos" DROP COLUMN "isDeleted";
        `);

        await queryRunner.query(`
            ALTER TABLE "photos" DROP COLUMN "extension";
        `);
    }
} 