import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableColumn } from "typeorm";

export class CreatePostsPhotosTable1711072900001 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Создаем таблицу связи
        await queryRunner.createTable(
            new Table({
                name: "posts_photos",
                columns: [
                    {
                        name: "postId",
                        type: "int"
                    },
                    {
                        name: "photoId",
                        type: "int"
                    }
                ]
            })
        );

        // Добавляем внешние ключи
        await queryRunner.createForeignKey(
            "posts_photos",
            new TableForeignKey({
                columnNames: ["postId"],
                referencedColumnNames: ["id"],
                referencedTableName: "posts",
                onDelete: "CASCADE"
            })
        );

        await queryRunner.createForeignKey(
            "posts_photos",
            new TableForeignKey({
                columnNames: ["photoId"],
                referencedColumnNames: ["id"],
                referencedTableName: "photos",
                onDelete: "CASCADE"
            })
        );

        // Удаляем старую связь, если она есть
        const table = await queryRunner.getTable("photos");
        if (table) {
            const foreignKey = table.foreignKeys.find(fk => fk.columnNames.indexOf("postId") !== -1);
            if (foreignKey) {
                await queryRunner.dropForeignKey("photos", foreignKey);
            }
            if (await queryRunner.hasColumn("photos", "postId")) {
                await queryRunner.dropColumn("photos", "postId");
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Добавляем обратно колонку postId
        await queryRunner.addColumn(
            "photos",
            new TableColumn({
                name: "postId",
                type: "int",
                isNullable: true
            })
        );

        // Добавляем обратно внешний ключ
        await queryRunner.createForeignKey(
            "photos",
            new TableForeignKey({
                columnNames: ["postId"],
                referencedColumnNames: ["id"],
                referencedTableName: "posts",
                onDelete: "SET NULL"
            })
        );

        // Удаляем таблицу связи
        await queryRunner.dropTable("posts_photos");
    }
} 