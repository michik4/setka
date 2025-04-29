"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddUserAvatar1710000000001 = void 0;
class AddUserAvatar1710000000001 {
    constructor() {
        this.name = 'AddUserAvatar1710000000001';
    }
    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatarId" integer`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_users_photos_avatarId" FOREIGN KEY ("avatarId") REFERENCES "photos"("id") ON DELETE SET NULL`);
    }
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "FK_users_photos_avatarId"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "avatarId"`);
    }
}
exports.AddUserAvatar1710000000001 = AddUserAvatar1710000000001;
