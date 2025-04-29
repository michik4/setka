import { MigrationInterface, QueryRunner } from "typeorm";

export class AddParentIdToComments1742847180001 implements MigrationInterface {
    name = 'AddParentIdToComments1742847180001'

    public async up(queryRunner: QueryRunner): Promise<void> {
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

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Удаление внешнего ключа
        await queryRunner.query(`ALTER TABLE "comments" DROP CONSTRAINT "FK_comments_parent"`);
        
        // Удаление колонки
        await queryRunner.query(`ALTER TABLE "comments" DROP COLUMN "parentId"`);
    }
} 