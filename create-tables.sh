#!/bin/bash
echo "Создание основных таблиц в базе данных..."

# Запрашиваем данные для подключения к PostgreSQL
read -p "Введите имя пользователя PostgreSQL: " PGUSER
read -s -p "Введите пароль PostgreSQL: " PGPASSWORD
echo
read -p "Введите имя базы данных: " PGDATABASE

# Экспортируем переменные окружения для psql
export PGUSER
export PGPASSWORD
export PGDATABASE

# Создаем основные таблицы
echo "Создание основных таблиц..."

# Создаем таблицу для пользователей, если она не существует
psql -c "
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    \"firstName\" VARCHAR(255) NOT NULL,
    \"lastName\" VARCHAR(255) NOT NULL,
    nickname VARCHAR(255) DEFAULT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    status VARCHAR(255) DEFAULT 'online',
    \"avatarId\" INTEGER DEFAULT NULL,
    \"createdAt\" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \"updatedAt\" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);"

# Создаем таблицу для музыкальных альбомов, если она не существует
psql -c "
CREATE TABLE IF NOT EXISTS music_albums (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    \"userId\" INTEGER,
    \"groupId\" INTEGER,
    description TEXT,
    \"isPrivate\" BOOLEAN DEFAULT false,
    \"coverImage\" VARCHAR(255),
    \"createdAt\" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \"updatedAt\" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);"

# Очищаем переменные окружения
unset PGUSER
unset PGPASSWORD
unset PGDATABASE

echo "Основные таблицы созданы. Теперь вы можете попробовать запустить миграции снова." 