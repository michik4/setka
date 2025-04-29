import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBannedUsers1743010000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Создаем таблицу забаненных пользователей группы
        await queryRunner.query(`
            CREATE TABLE "group_banned_users" (
                "groupId" integer NOT NULL,
                "userId" integer NOT NULL,
                CONSTRAINT "PK_group_banned_users" PRIMARY KEY ("groupId", "userId")
            )
        `);

        // Добавляем связи
        await queryRunner.query(`
            ALTER TABLE "group_banned_users" ADD CONSTRAINT "FK_group_banned_users_group" 
            FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE
        `);

        await queryRunner.query(`
            ALTER TABLE "group_banned_users" ADD CONSTRAINT "FK_group_banned_users_user" 
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "group_banned_users" DROP CONSTRAINT "FK_group_banned_users_user"
        `);
        
        await queryRunner.query(`
            ALTER TABLE "group_banned_users" DROP CONSTRAINT "FK_group_banned_users_group"
        `);
        
        await queryRunner.query(`
            DROP TABLE "group_banned_users"
        `);
    }
} 