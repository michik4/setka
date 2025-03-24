import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from "typeorm";

export class AddWallPostIdToPhotos1710000000002 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(
            "photos",
            new TableColumn({
                name: "wallPostId",
                type: "int",
                isNullable: true
            })
        );

        await queryRunner.createForeignKey(
            "photos",
            new TableForeignKey({
                columnNames: ["wallPostId"],
                referencedColumnNames: ["id"],
                referencedTableName: "wall_posts",
                onDelete: "SET NULL"
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("photos");
        const foreignKey = table?.foreignKeys.find(fk => fk.columnNames.indexOf("wallPostId") !== -1);
        if (foreignKey) {
            await queryRunner.dropForeignKey("photos", foreignKey);
        }
        await queryRunner.dropColumn("photos", "wallPostId");
    }
} 