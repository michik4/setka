import { MigrationInterface, QueryRunner } from "typeorm"

export class AddNicknameToUsers1711072800000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Сначала добавляем столбец как nullable
        await queryRunner.query(`
            ALTER TABLE users
            ADD COLUMN nickname VARCHAR(50) NULL;
        `)

        // Добавляем уникальный индекс
        await queryRunner.query(`
            CREATE UNIQUE INDEX idx_users_nickname ON users (nickname);
        `)

        // Обновляем существующие записи
        await queryRunner.query(`
            UPDATE users
            SET nickname = CONCAT('user', id)
            WHERE nickname IS NULL;
        `)

        // Делаем столбец NOT NULL после обновления данных
        await queryRunner.query(`
            ALTER TABLE users
            ALTER COLUMN nickname SET NOT NULL;
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Удаляем уникальный индекс
        await queryRunner.query(`
            DROP INDEX IF EXISTS idx_users_nickname;
        `)

        // Удаляем столбец
        await queryRunner.query(`
            ALTER TABLE users
            DROP COLUMN IF EXISTS nickname;
        `)
    }
} 