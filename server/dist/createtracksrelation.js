"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_connect_1 = require("./db/db_connect");
const typeorm_1 = require("typeorm");
// Скрипт для создания таблицы posts_tracks
async function createPostsTracksTable() {
    try {
        // Инициализируем соединение с базой данных
        await db_connect_1.AppDataSource.initialize();
        // Получаем queryRunner для выполнения SQL-запросов
        const queryRunner = db_connect_1.AppDataSource.createQueryRunner();
        // Проверяем, существует ли уже таблица
        const tableExists = await queryRunner.hasTable('posts_tracks');
        if (tableExists) {
            console.log('Таблица posts_tracks уже существует, пропускаем создание');
            await db_connect_1.AppDataSource.destroy();
            return;
        }
        console.log('Создание таблицы posts_tracks...');
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
        // Закрываем соединение с базой данных
        await db_connect_1.AppDataSource.destroy();
    }
    catch (error) {
        console.error('Ошибка при создании таблицы posts_tracks:', error);
        await db_connect_1.AppDataSource.destroy();
    }
}
// Запускаем скрипт
createPostsTracksTable()
    .then(() => console.log('Скрипт выполнен успешно'))
    .catch(error => console.error('Ошибка при выполнении скрипта:', error));
