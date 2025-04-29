"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateAlbums1710000000003 = void 0;
const typeorm_1 = require("typeorm");
class CreateAlbums1710000000003 {
    async up(queryRunner) {
        // Создание таблицы альбомов
        await queryRunner.createTable(new typeorm_1.Table({
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
        await queryRunner.createTable(new typeorm_1.Table({
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
        await queryRunner.createForeignKey("albums", new typeorm_1.TableForeignKey({
            columnNames: ["userId"],
            referencedColumnNames: ["id"],
            referencedTableName: "users",
            onDelete: "CASCADE"
        }));
        // Добавление внешних ключей для связующей таблицы
        await queryRunner.createForeignKey("album_photos", new typeorm_1.TableForeignKey({
            columnNames: ["albumId"],
            referencedColumnNames: ["id"],
            referencedTableName: "albums",
            onDelete: "CASCADE"
        }));
        await queryRunner.createForeignKey("album_photos", new typeorm_1.TableForeignKey({
            columnNames: ["photoId"],
            referencedColumnNames: ["id"],
            referencedTableName: "photos",
            onDelete: "CASCADE"
        }));
    }
    async down(queryRunner) {
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
exports.CreateAlbums1710000000003 = CreateAlbums1710000000003;
