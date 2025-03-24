import { DataSource } from "typeorm"
import dotenv from 'dotenv'
import path from 'path'

// Загружаем переменные окружения
dotenv.config()

// Создаем подключение к базе данных
export const AppDataSource = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    username: process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD || "!CvBn3228",
    database: process.env.DB_NAME || "vseti",
    synchronize: false, // Отключаем синхронизацию
    dropSchema: false,
    logging: process.env.NODE_ENV !== "production",
    entities: [path.join(__dirname, "..", "entities", "*.entity.{ts,js}")],
    migrations: [path.join(__dirname, "migrations", "*.{ts,js}")],
    migrationsTableName: "migrations"
})

// Функция инициализации подключения
export const initializeDB = async () => {
    try {
        await AppDataSource.initialize()
        console.log("База данных успешно подключена")
    } catch (error) {
        console.error("Ошибка при подключении к базе данных:", error)
        throw error
    }
}
