// Скрипт для запуска миграции TypeORM
const { AppDataSource } = require('../db/db_connect');

async function applyMigration() {
    try {
        // Инициализируем соединение с базой данных
        await AppDataSource.initialize();
        console.log('База данных подключена');

        // Запускаем миграцию
        await AppDataSource.runMigrations();
        console.log('Миграции успешно применены');

        // Закрываем соединение
        await AppDataSource.destroy();
        console.log('Соединение с базой данных закрыто');
    } catch (error) {
        console.error('Ошибка при применении миграций:', error);
    }
}

applyMigration(); 