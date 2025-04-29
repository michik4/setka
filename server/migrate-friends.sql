-- Создание таблицы для запросов в друзья
CREATE TABLE IF NOT EXISTS friends_requests (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_friends_request UNIQUE (sender_id, receiver_id),
    CONSTRAINT different_users CHECK (sender_id <> receiver_id)
);

-- Создание таблицы для хранения дружеских связей
CREATE TABLE IF NOT EXISTS friends (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_friendship UNIQUE (user_id, friend_id),
    CONSTRAINT different_users CHECK (user_id <> friend_id)
);

-- Индексы для ускорения поиска
CREATE INDEX IF NOT EXISTS idx_friends_requests_sender ON friends_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friends_requests_receiver ON friends_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friends_requests_status ON friends_requests(status);
CREATE INDEX IF NOT EXISTS idx_friends_user ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend ON friends(friend_id); 