-- Проверяем существование столбцов в таблице messages
DO $$ 
BEGIN
    -- Если таблица messages еще не существует, создаем ее
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'messages') THEN
        CREATE TABLE messages (
            id SERIAL PRIMARY KEY,
            content TEXT NOT NULL,
            sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
    ELSE
        -- Добавляем новые столбцы, если они не существуют
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'sender_id') THEN
            ALTER TABLE messages ADD COLUMN sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'conversation_id') THEN
            ALTER TABLE messages ADD COLUMN conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'is_read') THEN
            ALTER TABLE messages ADD COLUMN is_read BOOLEAN DEFAULT FALSE;
        END IF;
        
        -- Проверяем наличие столбцов created_at и updated_at
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'created_at') THEN
            ALTER TABLE messages ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT NOW();
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'updated_at') THEN
            ALTER TABLE messages ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT NOW();
        END IF;
    END IF;
END $$;

-- Добавляем индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Добавление внешнего ключа для последнего сообщения в беседе
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_last_message'
    ) THEN
        ALTER TABLE conversations 
        ADD CONSTRAINT fk_last_message 
        FOREIGN KEY (last_message_id) 
        REFERENCES messages(id) ON DELETE SET NULL;
    END IF;
END $$; 