"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_connect_1 = require("../db/db_connect");
beforeAll(async () => {
    // Инициализация тестовой базы данных или моков
});
afterAll(async () => {
    // Закрытие соединений с базой данных
    if (db_connect_1.AppDataSource.isInitialized) {
        await db_connect_1.AppDataSource.destroy();
    }
});
