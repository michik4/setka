import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreatePostsTracks1680078633000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        console.log('Создание таблицы связи постов и треков');
        
        // Создаем таблицу для связи постов и треков
        await queryRunner.createTable(
            new Table({
                name: "posts_tracks",
                columns: [
                    {
                        name: "postId",
                        type: "int",
                        isNullable: false
                    },
                    {
                        name: "trackId",
                        type: "int",
                        isNullable: false
                    }
                ],
                indices: [
                    {
                        name: "posts_tracks_pk",
                        columnNames: ["postId", "trackId"],
                        isUnique: true
                    }
                ]
            }),
            true
        );

        // Создаем внешний ключ к таблице постов
        await queryRunner.createForeignKey(
            "posts_tracks",
            new TableForeignKey({
                columnNames: ["postId"],
                referencedColumnNames: ["id"],
                referencedTableName: "posts",
                onDelete: "CASCADE"
            })
        );

        // Создаем внешний ключ к таблице треков
        await queryRunner.createForeignKey(
            "posts_tracks",
            new TableForeignKey({
                columnNames: ["trackId"],
                referencedColumnNames: ["id"],
                referencedTableName: "music_tracks",
                onDelete: "CASCADE"
            })
        );

        console.log('Таблица posts_tracks успешно создана');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        console.log('Удаление таблицы связи постов и треков');
        
        // Удаляем внешние ключи
        const table = await queryRunner.getTable("posts_tracks");
        if (table) {
            const foreignKeyPost = table.foreignKeys.find(fk => fk.columnNames.indexOf("postId") !== -1);
            if (foreignKeyPost) {
                await queryRunner.dropForeignKey("posts_tracks", foreignKeyPost);
            }
            
            const foreignKeyTrack = table.foreignKeys.find(fk => fk.columnNames.indexOf("trackId") !== -1);
            if (foreignKeyTrack) {
                await queryRunner.dropForeignKey("posts_tracks", foreignKeyTrack);
            }
        }
        
        // Удаляем таблицу
        await queryRunner.dropTable("posts_tracks");
        
        console.log('Таблица posts_tracks успешно удалена');
    }
} 