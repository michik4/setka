import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreateMusicAlbums1720000000001 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Создание таблицы музыкальных альбомов
        await queryRunner.createTable(new Table({
            name: "music_albums",
            columns: [
                {
                    name: "id",
                    type: "int",
                    isPrimary: true,
                    isGenerated: true,
                    generationStrategy: "increment"
                },
                {
                    name: "title",
                    type: "varchar",
                    isNullable: false
                },
                {
                    name: "description",
                    type: "varchar",
                    isNullable: true
                },
                {
                    name: "userId",
                    type: "int",
                    isNullable: false
                },
                {
                    name: "coverUrl",
                    type: "varchar",
                    isNullable: true
                },
                {
                    name: "tracksCount",
                    type: "int",
                    default: 0
                },
                {
                    name: "isPrivate",
                    type: "boolean",
                    default: false
                },
                {
                    name: "createdAt",
                    type: "timestamp",
                    default: "now()"
                },
                {
                    name: "updatedAt",
                    type: "timestamp",
                    default: "now()"
                }
            ]
        }), true);

        // Создание связующей таблицы между альбомами и треками
        await queryRunner.createTable(new Table({
            name: "music_album_tracks",
            columns: [
                {
                    name: "albumId",
                    type: "int",
                    isNullable: false
                },
                {
                    name: "trackId",
                    type: "int",
                    isNullable: false
                }
            ]
        }), true);

        // Добавление внешнего ключа для userId в таблице music_albums
        await queryRunner.createForeignKey("music_albums", new TableForeignKey({
            columnNames: ["userId"],
            referencedColumnNames: ["id"],
            referencedTableName: "users",
            onDelete: "CASCADE"
        }));

        // Добавление внешних ключей для связующей таблицы
        await queryRunner.createForeignKey("music_album_tracks", new TableForeignKey({
            columnNames: ["albumId"],
            referencedColumnNames: ["id"],
            referencedTableName: "music_albums",
            onDelete: "CASCADE"
        }));

        await queryRunner.createForeignKey("music_album_tracks", new TableForeignKey({
            columnNames: ["trackId"],
            referencedColumnNames: ["id"],
            referencedTableName: "music_tracks",
            onDelete: "CASCADE"
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Удаление внешних ключей
        const albumTracksTable = await queryRunner.getTable("music_album_tracks");
        const albumsTable = await queryRunner.getTable("music_albums");
        
        if (albumTracksTable) {
            const foreignKeys = albumTracksTable.foreignKeys;
            for (const foreignKey of foreignKeys) {
                await queryRunner.dropForeignKey("music_album_tracks", foreignKey);
            }
        }

        if (albumsTable) {
            const foreignKeys = albumsTable.foreignKeys;
            for (const foreignKey of foreignKeys) {
                await queryRunner.dropForeignKey("music_albums", foreignKey);
            }
        }

        // Удаление таблиц
        await queryRunner.dropTable("music_album_tracks");
        await queryRunner.dropTable("music_albums");
    }
} 