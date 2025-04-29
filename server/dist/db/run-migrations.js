"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_connect_1 = require("./db_connect");
const _1685023456789_AddGroupIdToMusicAlbum_1 = require("../migrations/1685023456789-AddGroupIdToMusicAlbum");
const _1685023456790_RemoveTracksCountFromMusicAlbum_1 = require("../migrations/1685023456790-RemoveTracksCountFromMusicAlbum");
async function runMigrations() {
    try {
        // Инициализация подключения к базе данных
        await db_connect_1.AppDataSource.initialize();
        console.log('Подключение к базе данных установлено успешно.');
        // Запуск миграций
        console.log('Запуск миграции: AddGroupIdToMusicAlbum...');
        const migration1 = new _1685023456789_AddGroupIdToMusicAlbum_1.AddGroupIdToMusicAlbum1685023456789();
        await migration1.up(db_connect_1.AppDataSource.manager.connection.createQueryRunner());
        console.log('Миграция AddGroupIdToMusicAlbum выполнена успешно.');
        console.log('Запуск миграции: RemoveTracksCountFromMusicAlbum...');
        const migration2 = new _1685023456790_RemoveTracksCountFromMusicAlbum_1.RemoveTracksCountFromMusicAlbum1685023456790();
        await migration2.up(db_connect_1.AppDataSource.manager.connection.createQueryRunner());
        console.log('Миграция RemoveTracksCountFromMusicAlbum выполнена успешно.');
        console.log('Все миграции выполнены успешно.');
    }
    catch (error) {
        console.error('Ошибка при выполнении миграций:', error);
    }
    finally {
        // Закрываем соединение с базой данных
        if (db_connect_1.AppDataSource.isInitialized) {
            await db_connect_1.AppDataSource.destroy();
            console.log('Соединение с базой данных закрыто.');
        }
    }
}
runMigrations();
