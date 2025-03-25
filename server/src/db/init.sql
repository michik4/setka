-- Создание таблицы лайков
CREATE TABLE IF NOT EXISTS "likes" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "postId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "UQ_user_post" UNIQUE ("userId", "postId"),
    CONSTRAINT "FK_likes_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
    CONSTRAINT "FK_likes_post" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE
); 