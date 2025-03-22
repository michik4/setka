import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreateSessionsTable1711072000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "sessions",
                columns: [
                    {
                        name: "sessionId",
                        type: "varchar",
                        isPrimary: true
                    },
                    {
                        name: "userId",
                        type: "int"
                    },
                    {
                        name: "deviceInfo",
                        type: "varchar",
                        isNullable: true
                    },
                    {
                        name: "ipAddress",
                        type: "varchar"
                    },
                    {
                        name: "lastActivity",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP"
                    },
                    {
                        name: "expiresAt",
                        type: "timestamp"
                    },
                    {
                        name: "isActive",
                        type: "boolean",
                        default: true
                    }
                ]
            }),
            true
        );

        await queryRunner.createForeignKey(
            "sessions",
            new TableForeignKey({
                columnNames: ["userId"],
                referencedColumnNames: ["id"],
                referencedTableName: "users",
                onDelete: "CASCADE"
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("sessions");
        if (table) {
            const foreignKey = table.foreignKeys.find(fk => fk.columnNames.indexOf("userId") !== -1);
            if (foreignKey) {
                await queryRunner.dropForeignKey("sessions", foreignKey);
            }
        }
        await queryRunner.dropTable("sessions");
    }
} 