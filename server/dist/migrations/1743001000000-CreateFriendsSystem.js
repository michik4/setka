"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateFriendsSystem1743001000000 = void 0;
class CreateFriendsSystem1743001000000 {
    async up(queryRunner) {
        // Создаем таблицу запросов в друзья
        await queryRunner.query(`
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
            
            CREATE INDEX IF NOT EXISTS "idx_friends_requests_sender" ON "friends_requests" ("sender_id");
            CREATE INDEX IF NOT EXISTS "idx_friends_requests_receiver" ON "friends_requests" ("receiver_id");
            CREATE UNIQUE INDEX IF NOT EXISTS "idx_unique_friend_request" ON "friends_requests" ("sender_id", "receiver_id");
        `);
        // Создаем таблицу друзей
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "friends" (
                "id" SERIAL PRIMARY KEY,
                "user_id" INTEGER NOT NULL,
                "friend_id" INTEGER NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "fk_user" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE,
                CONSTRAINT "fk_friend" FOREIGN KEY ("friend_id") REFERENCES "users" ("id") ON DELETE CASCADE
            );
            
            CREATE INDEX IF NOT EXISTS "idx_friends_user" ON "friends" ("user_id");
            CREATE INDEX IF NOT EXISTS "idx_friends_friend" ON "friends" ("friend_id");
            CREATE UNIQUE INDEX IF NOT EXISTS "idx_unique_friendship" ON "friends" ("user_id", "friend_id");
        `);
    }
    async down(queryRunner) {
        // Удаляем таблицы в обратном порядке
        await queryRunner.query(`DROP TABLE IF EXISTS "friends"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "friends_requests"`);
    }
}
exports.CreateFriendsSystem1743001000000 = CreateFriendsSystem1743001000000;
