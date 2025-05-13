import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsInLibraryToMusicAlbums1744000000000 implements MigrationInterface {
    name = 'AddIsInLibraryToMusicAlbums1744000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "music_albums" ADD "isInLibrary" boolean NOT NULL DEFAULT true`);
        console.log(`[Migration] Добавлено поле 'isInLibrary' в таблицу 'music_albums' со значением по умолчанию 'true'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "music_albums" DROP COLUMN "isInLibrary"`);
        console.log(`[Migration] Удалено поле 'isInLibrary' из таблицы 'music_albums'`);
    }
} 