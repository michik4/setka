"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddGroupIdToMusicAlbum1685023456789 = void 0;
class AddGroupIdToMusicAlbum1685023456789 {
    async up(queryRunner) {
        // Добавление поля groupId в таблицу music_albums
        await queryRunner.query(`
            ALTER TABLE "music_albums" 
            ADD COLUMN IF NOT EXISTS "groupId" integer NULL
        `);
        // Добавление внешнего ключа
        await queryRunner.query(`
            ALTER TABLE "music_albums" 
            ADD CONSTRAINT "FK_music_albums_groupId" 
            FOREIGN KEY ("groupId") 
            REFERENCES "groups"("id") 
            ON DELETE SET NULL
        `);
    }
    async down(queryRunner) {
        // Удаление внешнего ключа
        await queryRunner.query(`
            ALTER TABLE "music_albums" 
            DROP CONSTRAINT IF EXISTS "FK_music_albums_groupId"
        `);
        // Удаление поля groupId
        await queryRunner.query(`
            ALTER TABLE "music_albums" 
            DROP COLUMN IF EXISTS "groupId"
        `);
    }
}
exports.AddGroupIdToMusicAlbum1685023456789 = AddGroupIdToMusicAlbum1685023456789;
