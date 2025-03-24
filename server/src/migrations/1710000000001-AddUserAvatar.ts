import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserAvatar1710000000001 implements MigrationInterface {
    name = 'AddUserAvatar1710000000001'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatarId" integer`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_users_photos_avatarId" FOREIGN KEY ("avatarId") REFERENCES "photos"("id") ON DELETE SET NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "FK_users_photos_avatarId"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "avatarId"`);
    }
} 