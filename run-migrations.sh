#!/bin/bash
echo "Запуск миграций базы данных..."
cd ~/server
npm run migrations:run

echo "Миграции выполнены. Проверьте наличие ошибок в выводе." 