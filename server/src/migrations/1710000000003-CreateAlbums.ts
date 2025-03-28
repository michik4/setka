import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreateAlbums1710000000003 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Создание таблицы альбомов
        await queryRunner.createTable(new Table({
            name: "albums",
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
                    name: "isPrivate",
                    type: "boolean",
                    default: false
                },
                {
                    name: "photosCount",
                    type: "int",
                    default: 0
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

        // Создание связующей таблицы между альбомами и фотографиями
        await queryRunner.createTable(new Table({
            name: "album_photos",
            columns: [
                {
                    name: "albumId",
                    type: "int",
                    isNullable: false
                },
                {
                    name: "photoId",
                    type: "int",
                    isNullable: false
                }
            ]
        }), true);

        // Добавление внешнего ключа для userId в таблице albums
        await queryRunner.createForeignKey("albums", new TableForeignKey({
            columnNames: ["userId"],
            referencedColumnNames: ["id"],
            referencedTableName: "users",
            onDelete: "CASCADE"
        }));

        // Добавление внешних ключей для связующей таблицы
        await queryRunner.createForeignKey("album_photos", new TableForeignKey({
            columnNames: ["albumId"],
            referencedColumnNames: ["id"],
            referencedTableName: "albums",
            onDelete: "CASCADE"
        }));

        await queryRunner.createForeignKey("album_photos", new TableForeignKey({
            columnNames: ["photoId"],
            referencedColumnNames: ["id"],
            referencedTableName: "photos",
            onDelete: "CASCADE"
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Удаление внешних ключей
        const albumPhotosTable = await queryRunner.getTable("album_photos");
        const albumsTable = await queryRunner.getTable("albums");
        
        if (albumPhotosTable) {
            const foreignKeys = albumPhotosTable.foreignKeys;
            for (const foreignKey of foreignKeys) {
                await queryRunner.dropForeignKey("album_photos", foreignKey);
            }
        }

        if (albumsTable) {
            const foreignKeys = albumsTable.foreignKeys;
            for (const foreignKey of foreignKeys) {
                await queryRunner.dropForeignKey("albums", foreignKey);
            }
        }

        // Удаление таблиц
        await queryRunner.dropTable("album_photos");
        await queryRunner.dropTable("albums");
    }
} 