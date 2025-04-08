"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_connect_1 = require("./db/db_connect");
const runMigrations = async () => {
    try {
        await db_connect_1.AppDataSource.initialize();
        console.log("База данных подключена");
        await db_connect_1.AppDataSource.runMigrations();
        console.log("Миграции успешно выполнены");
        await db_connect_1.AppDataSource.destroy();
        console.log("Соединение закрыто");
    }
    catch (error) {
        console.error("Ошибка при выполнении миграций:", error);
        process.exit(1);
    }
};
runMigrations();
