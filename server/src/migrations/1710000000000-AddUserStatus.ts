import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserStatus1710000000000 implements MigrationInterface {
    name = 'AddUserStatus1710000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "status"`);
    }
} 