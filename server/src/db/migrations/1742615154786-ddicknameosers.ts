import { MigrationInterface, QueryRunner } from "typeorm";

export class Ddicknameosers1742615154786 implements MigrationInterface {
    name = 'Ddicknameosers1742615154786'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "nickname" character varying(50) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "UQ_ad02a1be8707004cb805a4b5023" UNIQUE ("nickname")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "UQ_ad02a1be8707004cb805a4b5023"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "nickname"`);
    }

}
