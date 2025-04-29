-- 1. Создаем таблицу комментариев
CREATE TABLE IF NOT EXISTS "comments" (
    "id" SERIAL NOT NULL,
    "content" text NOT NULL,
    "postId" integer NOT NULL,
    "authorId" integer NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_comments_id" PRIMARY KEY ("id")
);

-- Добавляем внешние ключи для комментариев
ALTER TABLE "comments"
ADD CONSTRAINT "FK_comments_author"
FOREIGN KEY ("authorId") REFERENCES "users"("id")
ON DELETE CASCADE
ON UPDATE NO ACTION;

ALTER TABLE "comments"
ADD CONSTRAINT "FK_comments_post"
FOREIGN KEY ("postId") REFERENCES "posts"("id")
ON DELETE CASCADE
ON UPDATE NO ACTION;

-- 2. Обновляем таблицу лайков для работы с постами если нужно
-- Проверяем существование колонки postId
DO $$ 
BEGIN
    -- Проверяем, существует ли таблица likes и колонка postId
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'likes') 
    AND NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'likes' AND column_name = 'postId'
    ) THEN
        -- Добавляем колонку postId
        ALTER TABLE "likes" ADD COLUMN "postId" integer;
    END IF;
END $$; 