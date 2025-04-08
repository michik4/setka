"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateMusicTable1680078632000 = void 0;
const typeorm_1 = require("typeorm");
class CreateMusicTable1680078632000 {
    async up(queryRunner) {
        await queryRunner.createTable(new typeorm_1.Table({
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
        }), true);
        await queryRunner.createForeignKey("music_tracks", new typeorm_1.TableForeignKey({
            columnNames: ["userId"],
            referencedColumnNames: ["id"],
            referencedTableName: "users",
            onDelete: "CASCADE"
        }));
    }
    async down(queryRunner) {
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
exports.CreateMusicTable1680078632000 = CreateMusicTable1680078632000;
