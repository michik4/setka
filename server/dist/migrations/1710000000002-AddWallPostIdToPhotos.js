"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddWallPostIdToPhotos1710000000002 = void 0;
const typeorm_1 = require("typeorm");
class AddWallPostIdToPhotos1710000000002 {
    async up(queryRunner) {
        await queryRunner.addColumn("photos", new typeorm_1.TableColumn({
            name: "wallPostId",
            type: "int",
            isNullable: true
        }));
        await queryRunner.createForeignKey("photos", new typeorm_1.TableForeignKey({
            columnNames: ["wallPostId"],
            referencedColumnNames: ["id"],
            referencedTableName: "wall_posts",
            onDelete: "SET NULL"
        }));
    }
    async down(queryRunner) {
        const table = await queryRunner.getTable("photos");
        const foreignKey = table === null || table === void 0 ? void 0 : table.foreignKeys.find(fk => fk.columnNames.indexOf("wallPostId") !== -1);
        if (foreignKey) {
            await queryRunner.dropForeignKey("photos", foreignKey);
        }
        await queryRunner.dropColumn("photos", "wallPostId");
    }
}
exports.AddWallPostIdToPhotos1710000000002 = AddWallPostIdToPhotos1710000000002;
