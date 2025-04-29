#!/bin/bash
echo "Синхронизация схемы базы данных..."
cd ~/server

# Создаем временный файл для выполнения синхронизации схемы
cat > sync-schema.ts << 'EOF'
import { AppDataSource } from "./src/db/db_connect";

const syncSchema = async () => {
    try {
        await AppDataSource.initialize();
        console.log("База данных подключена");

        // Синхронизируем схему
        await AppDataSource.synchronize(false); // false не сбрасывает базу, а обновляет
        console.log("Схема базы данных синхронизирована");

        await AppDataSource.destroy();
        console.log("Соединение закрыто");
    } catch (error) {
        console.error("Ошибка при синхронизации схемы:", error);
        process.exit(1);
    }
};

syncSchema();
EOF

# Запускаем скрипт синхронизации
echo "Запуск синхронизации схемы..."
npx ts-node sync-schema.ts

echo "Синхронизация завершена. Проверьте наличие ошибок в выводе." 