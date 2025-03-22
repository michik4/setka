-- Обновляем существующие записи
UPDATE users SET nickname = CONCAT('user', id) WHERE nickname IS NULL;

-- Проверяем результат
SELECT id, nickname FROM users; 