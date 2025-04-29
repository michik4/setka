"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_connect_1 = require("../db/db_connect");
const post_entity_1 = require("../entities/post.entity");
const music_entity_1 = require("../entities/music.entity");
async function fixPostTrackRelation() {
    try {
        // Инициализация соединения с БД
        await db_connect_1.AppDataSource.initialize();
        console.log('Соединение с БД установлено');
        // Проверка существования таблицы
        const tableExists = await db_connect_1.AppDataSource.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'posts_tracks'
      );
    `);
        console.log('Таблица posts_tracks существует:', tableExists[0].exists);
        if (!tableExists[0].exists) {
            // Создаем таблицу, если она не существует
            console.log('Создаем таблицу posts_tracks...');
            await db_connect_1.AppDataSource.query(`
        CREATE TABLE posts_tracks (
          "postId" integer NOT NULL,
          "trackId" integer NOT NULL,
          CONSTRAINT "PK_posts_tracks" PRIMARY KEY ("postId", "trackId")
        );
      `);
            console.log('Таблица posts_tracks создана');
        }
        // Получаем последний пост
        const lastPost = await db_connect_1.AppDataSource.getRepository(post_entity_1.Post)
            .createQueryBuilder('post')
            .orderBy('post.id', 'DESC')
            .getOne();
        if (!lastPost) {
            console.log('Посты не найдены');
            return;
        }
        console.log('Последний пост:', lastPost);
        // Получаем первый трек
        const firstTrack = await db_connect_1.AppDataSource.getRepository(music_entity_1.MusicTrack)
            .createQueryBuilder('track')
            .getOne();
        if (!firstTrack) {
            console.log('Треки не найдены');
            return;
        }
        console.log('Трек для связи:', firstTrack);
        // Создаем связь между последним постом и первым треком
        try {
            await db_connect_1.AppDataSource.query(`INSERT INTO posts_tracks ("postId", "trackId") VALUES ($1, $2) 
         ON CONFLICT ("postId", "trackId") DO NOTHING`, [lastPost.id, firstTrack.id]);
            console.log(`Связь создана между постом ${lastPost.id} и треком ${firstTrack.id}`);
        }
        catch (error) {
            console.error('Ошибка при создании связи:', error);
        }
        // Проверяем, создалась ли связь
        const relation = await db_connect_1.AppDataSource.query(`SELECT * FROM posts_tracks WHERE "postId" = $1 AND "trackId" = $2`, [lastPost.id, firstTrack.id]);
        console.log('Результат проверки связи:', relation);
        // Получаем все связи
        const allRelations = await db_connect_1.AppDataSource.query(`SELECT * FROM posts_tracks`);
        console.log('Все связи в таблице posts_tracks:', allRelations);
    }
    catch (error) {
        console.error('Ошибка:', error);
    }
    finally {
        // Закрываем соединение
        await db_connect_1.AppDataSource.destroy();
        console.log('Соединение с БД закрыто');
    }
}
fixPostTrackRelation().catch(console.error);
