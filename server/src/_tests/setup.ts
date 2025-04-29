import { AppDataSource } from '../db/db_connect';

beforeAll(async () => {
    // Инициализация тестовой базы данных или моков
});

afterAll(async () => {
    // Закрытие соединений с базой данных
    if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
    }
}); 