import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGroupIdToMusicAlbum1685023456789 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
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

    public async down(queryRunner: QueryRunner): Promise<void> {
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