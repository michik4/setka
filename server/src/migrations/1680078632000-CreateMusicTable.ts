import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreateMusicTable1680078632000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "music_tracks",
                columns: [
                    {
                        name: "id",
                        type: "int",
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: "increment"
                    },
                    {
                        name: "title",
                        type: "varchar",
                        length: "255"
                    },
                    {
                        name: "artist",
                        type: "varchar",
                        length: "255"
                    },
                    {
                        name: "duration",
                        type: "varchar",
                        length: "255"
                    },
                    {
                        name: "filename",
                        type: "varchar",
                        length: "255"
                    },
                    {
                        name: "filepath",
                        type: "varchar",
                        length: "255"
                    },
                    {
                        name: "coverUrl",
                        type: "varchar",
                        length: "255",
                        isNullable: true
                    },
                    {
                        name: "playCount",
                        type: "int",
                        default: 0
                    },
                    {
                        name: "userId",
                        type: "int"
                    },
                    {
                        name: "createdAt",
                        type: "timestamp",
                        default: "now()"
                    },
                    {
                        name: "updatedAt",
                        type: "timestamp",
                        default: "now()"
                    }
                ]
            }),
            true
        );

        await queryRunner.createForeignKey(
            "music_tracks",
            new TableForeignKey({
                columnNames: ["userId"],
                referencedColumnNames: ["id"],
                referencedTableName: "users",
                onDelete: "CASCADE"
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("music_tracks");
        if (table) {
            const foreignKey = table.foreignKeys.find(fk => fk.columnNames.indexOf("userId") !== -1);
            if (foreignKey) {
                await queryRunner.dropForeignKey("music_tracks", foreignKey);
            }
            await queryRunner.dropTable("music_tracks");
        }
    }
} 