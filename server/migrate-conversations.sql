-- Создание таблицы бесед
CREATE TABLE IF NOT EXISTS conversations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NULL,
    is_group BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_message_id INTEGER NULL,
    avatar_url VARCHAR(255) NULL
);

-- Создание таблицы участников бесед
CREATE TABLE IF NOT EXISTS conversation_participants (
    conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (conversation_id, user_id)
);

-- Индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at); 