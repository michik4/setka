"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemoveTracksCountFromMusicAlbum1685023456790 = void 0;
class RemoveTracksCountFromMusicAlbum1685023456790 {
    async up(queryRunner) {
        // Проверяем, существует ли колонка tracksCount
        const tableColumns = await queryRunner.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'music_albums' AND column_name = 'tracksCount'
        `);
        // Если колонка существует, удаляем ее
        if (tableColumns && tableColumns.length > 0) {
            await queryRunner.query(`
                ALTER TABLE "music_albums" 
                DROP COLUMN IF EXISTS "tracksCount"
            `);
            console.log('Удалена колонка tracksCount из таблицы music_albums');
        }
        else {
            console.log('Колонка tracksCount не существует в таблице music_albums');
        }
    }
    async down(queryRunner) {
        // Восстанавливаем колонку tracksCount
        await queryRunner.query(`
            ALTER TABLE "music_albums" 
            ADD COLUMN IF NOT EXISTS "tracksCount" integer DEFAULT 0
        `);
        // Обновляем значения
        await queryRunner.query(`
            UPDATE "music_albums" ma
            SET "tracksCount" = (
                SELECT COUNT(*)
                FROM "music_tracks" mt
                WHERE mt."albumId" = ma.id
            )
        `);
        console.log('Восстановлена колонка tracksCount в таблице music_albums');
    }
}
exports.RemoveTracksCountFromMusicAlbum1685023456790 = RemoveTracksCountFromMusicAlbum1685023456790;
