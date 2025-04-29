"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddWallOwnerIdToPosts1742846973457 = void 0;
class AddWallOwnerIdToPosts1742846973457 {
    constructor() {
        this.name = 'AddWallOwnerIdToPosts1742846973457';
    }
    async up(queryRunner) {
        // Добавление колонки wallOwnerId в таблицу posts
        await queryRunner.query(`ALTER TABLE "posts" ADD "wallOwnerId" integer`);
        // Добавление внешнего ключа для wallOwnerId, ссылающегося на users.id
        await queryRunner.query(`ALTER TABLE "posts" ADD CONSTRAINT "FK_posts_wallOwnerId" FOREIGN KEY ("wallOwnerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }
    async down(queryRunner) {
        // Удаление внешнего ключа
        await queryRunner.query(`ALTER TABLE "posts" DROP CONSTRAINT "FK_posts_wallOwnerId"`);
        // Удаление колонки wallOwnerId
        await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN "wallOwnerId"`);
    }
}
exports.AddWallOwnerIdToPosts1742846973457 = AddWallOwnerIdToPosts1742846973457;
