import { AppDataSource } from "./db/db_connect";

const runMigrations = async () => {
    try {
        await AppDataSource.initialize();
        console.log("База данных подключена");

        await AppDataSource.runMigrations();
        console.log("Миграции успешно выполнены");

        await AppDataSource.destroy();
        console.log("Соединение закрыто");
    } catch (error) {
        console.error("Ошибка при выполнении миграций:", error);
        process.exit(1);
    }
};

runMigrations(); 