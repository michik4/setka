import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreatePhotosTable1711072900000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "photos",
                columns: [
                    {
                        name: "id",
                        type: "int",
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: "increment"
                    },
                    {
                        name: "filename",
                        type: "varchar"
                    },
                    {
                        name: "originalName",
                        type: "varchar"
                    },
                    {
                        name: "mimetype",
                        type: "varchar"
                    },
                    {
                        name: "size",
                        type: "int"
                    },
                    {
                        name: "path",
                        type: "varchar"
                    },
                    {
                        name: "userId",
                        type: "int"
                    },
                    {
                        name: "description",
                        type: "varchar",
                        isNullable: true
                    },
                    {
                        name: "createdAt",
                        type: "timestamp",
                        default: "now()"
                    }
                ]
            })
        );

        await queryRunner.createForeignKey(
            "photos",
            new TableForeignKey({
                columnNames: ["userId"],
                referencedColumnNames: ["id"],
                referencedTableName: "users",
                onDelete: "CASCADE"
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("photos");
        if (table) {
            const foreignKey = table.foreignKeys.find(fk => fk.columnNames.indexOf("userId") !== -1);
            if (foreignKey) {
                await queryRunner.dropForeignKey("photos", foreignKey);
            }
        }
        await queryRunner.dropTable("photos");
    }
} 