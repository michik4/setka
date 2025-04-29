-- Создаем таблицу комментариев
CREATE TABLE IF NOT EXISTS "comments" (
    "id" SERIAL NOT NULL,
    "content" text NOT NULL,
    "postId" integer NOT NULL,
    "authorId" integer NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_comments_id" PRIMARY KEY ("id")
);

-- Добавляем внешние ключи
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