import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreatePostMusicAlbums1720000000010 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Создание таблицы связи постов с музыкальными альбомами
        await queryRunner.createTable(new Table({
            name: "post_music_albums",
            columns: [
                {
                    name: "id",
                    type: "int",
                    isPrimary: true,
                    isGenerated: true,
                    generationStrategy: "increment"
                },
                {
                    name: "postId",
                    type: "int",
                    isNullable: false
                },
                {
                    name: "musicAlbumId",
                    type: "int",
                    isNullable: false
                },
                {
                    name: "createdAt",
                    type: "timestamp",
                    default: "now()"
                }
            ]
        }), true);

        // Внешний ключ для postId
        await queryRunner.createForeignKey("post_music_albums", new TableForeignKey({
            columnNames: ["postId"],
            referencedColumnNames: ["id"],
            referencedTableName: "posts",
            onDelete: "CASCADE"
        }));

        // Внешний ключ для musicAlbumId
        await queryRunner.createForeignKey("post_music_albums", new TableForeignKey({
            columnNames: ["musicAlbumId"],
            referencedColumnNames: ["id"],
            referencedTableName: "music_albums",
            onDelete: "CASCADE"
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Удаление внешних ключей
        const table = await queryRunner.getTable("post_music_albums");
        if (table) {
            const foreignKeys = table.foreignKeys;
            for (const foreignKey of foreignKeys) {
                await queryRunner.dropForeignKey("post_music_albums", foreignKey);
            }
        }
        
        // Удаление таблицы
        await queryRunner.dropTable("post_music_albums");
    }
} 