-- Скрипт для создания таблиц системы друзей
-- Для PostgreSQL

-- Создаем таблицу запросов в друзья
CREATE TABLE IF NOT EXISTS "friends_requests" (
    "id" SERIAL PRIMARY KEY,
    "sender_id" INTEGER NOT NULL,
    "receiver_id" INTEGER NOT NULL,
    "status" VARCHAR(10) NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "fk_sender" FOREIGN KEY ("sender_id") REFERENCES "users" ("id") ON DELETE CASCADE,
    CONSTRAINT "fk_receiver" FOREIGN KEY ("receiver_id") REFERENCES "users" ("id") ON DELETE CASCADE
);

-- Создаем индексы для таблицы запросов в друзья
CREATE INDEX IF NOT EXISTS "idx_friends_requests_sender" ON "friends_requests" ("sender_id");
CREATE INDEX IF NOT EXISTS "idx_friends_requests_receiver" ON "friends_requests" ("receiver_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_unique_friend_request" ON "friends_requests" ("sender_id", "receiver_id");

-- Создаем таблицу друзей
CREATE TABLE IF NOT EXISTS "friends" (
    "id" SERIAL PRIMARY KEY,
    "user_id" INTEGER NOT NULL,
    "friend_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "fk_user" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE,
    CONSTRAINT "fk_friend" FOREIGN KEY ("friend_id") REFERENCES "users" ("id") ON DELETE CASCADE
);

-- Создаем индексы для таблицы друзей
CREATE INDEX IF NOT EXISTS "idx_friends_user" ON "friends" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_friends_friend" ON "friends" ("friend_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_unique_friendship" ON "friends" ("user_id", "friend_id");

-- Проверяем, что таблицы созданы успешно
SELECT 'Таблицы для системы друзей успешно созданы' AS message;

-- Для удаления таблиц используйте:
-- DROP TABLE IF EXISTS "friends";
-- DROP TABLE IF EXISTS "friends_requests"; 