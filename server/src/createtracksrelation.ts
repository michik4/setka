import { AppDataSource } from './db/db_connect';
import { Table, TableForeignKey } from 'typeorm';

// Скрипт для создания таблицы posts_tracks
async function createPostsTracksTable() {
    try {
        // Инициализируем соединение с базой данных
        await AppDataSource.initialize();
        
        // Получаем queryRunner для выполнения SQL-запросов
        const queryRunner = AppDataSource.createQueryRunner();
        
        // Проверяем, существует ли уже таблица
        const tableExists = await queryRunner.hasTable('posts_tracks');
        if (tableExists) {
            console.log('Таблица posts_tracks уже существует, пропускаем создание');
            await AppDataSource.destroy();
            return;
        }
        
        console.log('Создание таблицы posts_tracks...');
        
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
        
        // Закрываем соединение с базой данных
        await AppDataSource.destroy();
        
    } catch (error) {
        console.error('Ошибка при создании таблицы posts_tracks:', error);
        await AppDataSource.destroy();
    }
}

// Запускаем скрипт
createPostsTracksTable()
    .then(() => console.log('Скрипт выполнен успешно'))
    .catch(error => console.error('Ошибка при выполнении скрипта:', error)); 