"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreatePostsTracks1680078633000 = void 0;
const typeorm_1 = require("typeorm");
class CreatePostsTracks1680078633000 {
    async up(queryRunner) {
        console.log('Создание таблицы связи постов и треков');
        // Создаем таблицу для связи постов и треков
        await queryRunner.createTable(new typeorm_1.Table({
            name: "posts_tracks",
            columns: [
                {
                    name: "postId",
                    type: "int",
                    isNullable: false
                },
                {
                    name: "trackId",
                    type: "int",
                    isNullable: false
                }
            ],
            indices: [
                {
                    name: "posts_tracks_pk",
                    columnNames: ["postId", "trackId"],
                    isUnique: true
                }
            ]
        }), true);
        // Создаем внешний ключ к таблице постов
        await queryRunner.createForeignKey("posts_tracks", new typeorm_1.TableForeignKey({
            columnNames: ["postId"],
            referencedColumnNames: ["id"],
            referencedTableName: "posts",
            onDelete: "CASCADE"
        }));
        // Создаем внешний ключ к таблице треков
        await queryRunner.createForeignKey("posts_tracks", new typeorm_1.TableForeignKey({
            columnNames: ["trackId"],
            referencedColumnNames: ["id"],
            referencedTableName: "music_tracks",
            onDelete: "CASCADE"
        }));
        console.log('Таблица posts_tracks успешно создана');
    }
    async down(queryRunner) {
        console.log('Удаление таблицы связи постов и треков');
        // Удаляем внешние ключи
        const table = await queryRunner.getTable("posts_tracks");
        if (table) {
            const foreignKeyPost = table.foreignKeys.find(fk => fk.columnNames.indexOf("postId") !== -1);
            if (foreignKeyPost) {
                await queryRunner.dropForeignKey("posts_tracks", foreignKeyPost);
            }
            const foreignKeyTrack = table.foreignKeys.find(fk => fk.columnNames.indexOf("trackId") !== -1);
            if (foreignKeyTrack) {
                await queryRunner.dropForeignKey("posts_tracks", foreignKeyTrack);
            }
        }
        // Удаляем таблицу
        await queryRunner.dropTable("posts_tracks");
        console.log('Таблица posts_tracks успешно удалена');
    }
}
exports.CreatePostsTracks1680078633000 = CreatePostsTracks1680078633000;
