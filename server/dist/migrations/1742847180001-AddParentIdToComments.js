"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddParentIdToComments1742847180001 = void 0;
class AddParentIdToComments1742847180001 {
    constructor() {
        this.name = 'AddParentIdToComments1742847180001';
    }
    async up(queryRunner) {
        // Добавление колонки parentId
        await queryRunner.query(`
            ALTER TABLE "comments" 
            ADD COLUMN "parentId" integer NULL
        `);
        // Добавление внешнего ключа
        await queryRunner.query(`
            ALTER TABLE "comments"
            ADD CONSTRAINT "FK_comments_parent"
            FOREIGN KEY ("parentId") REFERENCES "comments"("id")
            ON DELETE CASCADE
            ON UPDATE NO ACTION
        `);
    }
    async down(queryRunner) {
        // Удаление внешнего ключа
        await queryRunner.query(`ALTER TABLE "comments" DROP CONSTRAINT "FK_comments_parent"`);
        // Удаление колонки
        await queryRunner.query(`ALTER TABLE "comments" DROP COLUMN "parentId"`);
    }
}
exports.AddParentIdToComments1742847180001 = AddParentIdToComments1742847180001;
