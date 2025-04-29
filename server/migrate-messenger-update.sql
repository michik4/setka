-- Добавляем новые столбцы в таблицу messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- Обновляем существующие данные, если они есть (предполагается, что у нас есть старый столбец chat_id)
-- Раскомментируйте следующие строки, если у вас была таблица с chat_id и нужен перенос данных
-- UPDATE messages SET conversation_id = chat_id WHERE conversation_id IS NULL AND chat_id IS NOT NULL;

-- Удаляем старые столбцы, если они есть
-- Раскомментируйте следующую строку, если хотите удалить столбец chat_id
-- ALTER TABLE messages DROP COLUMN IF EXISTS chat_id;

-- Добавляем индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Обновляем таблицу conversations, если она уже существует
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(255) NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at); 