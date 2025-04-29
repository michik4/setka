import { MigrationInterface, QueryRunner } from "typeorm";

export class AddWallOwnerIdToPosts1742846973457 implements MigrationInterface {
    name = 'AddWallOwnerIdToPosts1742846973457'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Добавление колонки wallOwnerId в таблицу posts
        await queryRunner.query(`ALTER TABLE "posts" ADD "wallOwnerId" integer`);
        
        // Добавление внешнего ключа для wallOwnerId, ссылающегося на users.id
        await queryRunner.query(`ALTER TABLE "posts" ADD CONSTRAINT "FK_posts_wallOwnerId" FOREIGN KEY ("wallOwnerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Удаление внешнего ключа
        await queryRunner.query(`ALTER TABLE "posts" DROP CONSTRAINT "FK_posts_wallOwnerId"`);
        
        // Удаление колонки wallOwnerId
        await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN "wallOwnerId"`);
    }
} 