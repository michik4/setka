#!/bin/bash
echo "Проверка таблиц в базе данных..."

# Запрашиваем данные для подключения к PostgreSQL
read -p "Введите имя пользователя PostgreSQL: " PGUSER
read -s -p "Введите пароль PostgreSQL: " PGPASSWORD
echo
read -p "Введите имя базы данных: " PGDATABASE

# Экспортируем переменные окружения для psql
export PGUSER
export PGPASSWORD
export PGDATABASE

# Выполняем запрос для получения списка таблиц
echo "Список таблиц в базе данных $PGDATABASE:"
psql -c "\dt"

# Очищаем переменные окружения
unset PGUSER
unset PGPASSWORD
unset PGDATABASE

echo "Проверка завершена." 