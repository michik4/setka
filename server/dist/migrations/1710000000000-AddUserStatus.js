"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddUserStatus1710000000000 = void 0;
class AddUserStatus1710000000000 {
    constructor() {
        this.name = 'AddUserStatus1710000000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status" character varying`);
    }
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "status"`);
    }
}
exports.AddUserStatus1710000000000 = AddUserStatus1710000000000;
