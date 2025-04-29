"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_connect_1 = require("../db/db_connect");
async function checkPostsTracks() {
    try {
        // Инициализация соединения с базой данных
        await db_connect_1.AppDataSource.initialize();
        console.log('Соединение с базой установлено');
        // Проверка существования таблицы posts_tracks
        const tableExists = await db_connect_1.AppDataSource.query(`
      SELECT EXISTS (
        SELECT FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'posts_tracks'
      );
    `);
        console.log('Таблица posts_tracks существует:', tableExists[0].exists);
        // Проверка существования таблицы wall_posts_tracks
        const wallTableExists = await db_connect_1.AppDataSource.query(`
      SELECT EXISTS (
        SELECT FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'wall_posts_tracks'
      );
    `);
        console.log('Таблица wall_posts_tracks существует:', wallTableExists[0].exists);
        // Получение всех записей из таблицы posts_tracks
        const postsTracks = await db_connect_1.AppDataSource.query('SELECT * FROM posts_tracks');
        console.log('Записи в таблице posts_tracks:', postsTracks);
        // Если таблица wall_posts_tracks существует, получаем записи и из неё
        if (wallTableExists[0].exists) {
            const wallPostsTracks = await db_connect_1.AppDataSource.query('SELECT * FROM wall_posts_tracks');
            console.log('Записи в таблице wall_posts_tracks:', wallPostsTracks);
        }
        // Проверка структуры таблицы posts_tracks
        const tableStructure = await db_connect_1.AppDataSource.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'posts_tracks';
    `);
        console.log('Структура таблицы posts_tracks:', tableStructure);
        // Проверка структуры таблицы wall_posts_tracks, если она существует
        if (wallTableExists[0].exists) {
            const wallTableStructure = await db_connect_1.AppDataSource.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'wall_posts_tracks';
      `);
            console.log('Структура таблицы wall_posts_tracks:', wallTableStructure);
        }
        // Проверка количества треков в каждом посте
        const postTrackCounts = await db_connect_1.AppDataSource.query(`
      SELECT "postId", COUNT(*) as track_count 
      FROM posts_tracks 
      GROUP BY "postId";
    `);
        console.log('Количество треков в постах:', postTrackCounts);
        // Проверка количества треков в каждом посте на стене
        if (wallTableExists[0].exists) {
            const wallPostTrackCounts = await db_connect_1.AppDataSource.query(`
        SELECT "wallPostId", COUNT(*) as track_count 
        FROM wall_posts_tracks 
        GROUP BY "wallPostId";
      `);
            console.log('Количество треков в постах на стене:', wallPostTrackCounts);
        }
        // Проверка связей
        const posts = await db_connect_1.AppDataSource.query(`
      SELECT p.id, p.content, COUNT(pt."trackId") as track_count
      FROM posts p
      LEFT JOIN posts_tracks pt ON p.id = pt."postId"
      GROUP BY p.id
      ORDER BY p.id DESC
      LIMIT 10;
    `);
        console.log('Последние 10 постов с количеством треков:', posts);
        // Проверка связей для wall_posts
        if (wallTableExists[0].exists) {
            const wallPosts = await db_connect_1.AppDataSource.query(`
        SELECT p.id, p.content, COUNT(pt."trackId") as track_count
        FROM wall_posts p
        LEFT JOIN wall_posts_tracks pt ON p.id = pt."wallPostId"
        GROUP BY p.id
        ORDER BY p.id DESC
        LIMIT 10;
      `);
            console.log('Последние 10 постов на стене с количеством треков:', wallPosts);
        }
    }
    catch (error) {
        console.error('Ошибка при проверке связей постов и треков:', error);
    }
    finally {
        // Закрываем соединение
        await db_connect_1.AppDataSource.destroy();
        console.log('Соединение с базой закрыто');
    }
}
checkPostsTracks().catch(error => console.error(error));
