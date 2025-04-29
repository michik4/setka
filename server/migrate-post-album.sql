-- Удаляем существующее ограничение внешнего ключа
ALTER TABLE post_album DROP CONSTRAINT IF EXISTS "FK_5f55d6841b167ab485fdf9d2c6e";

-- Обновляем ограничение внешнего ключа, чтобы оно ссылалось на таблицу posts вместо wall_posts
ALTER TABLE post_album ADD CONSTRAINT "FK_5f55d6841b167ab485fdf9d2c6e" 
    FOREIGN KEY ("postId") REFERENCES posts("id") ON DELETE CASCADE ON UPDATE NO ACTION; 