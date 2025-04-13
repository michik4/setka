import { AppDataSource } from '../db/db_connect';
import { Post } from '../entities/post.entity';
import { MusicTrack } from '../entities/music.entity';

async function fixPostTrackRelation() {
  try {
    // Инициализация соединения с БД
    await AppDataSource.initialize();
    console.log('Соединение с БД установлено');
    
    // Проверка существования таблицы
    const tableExists = await AppDataSource.query(`
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
      
      await AppDataSource.query(`
        CREATE TABLE posts_tracks (
          "postId" integer NOT NULL,
          "trackId" integer NOT NULL,
          CONSTRAINT "PK_posts_tracks" PRIMARY KEY ("postId", "trackId")
        );
      `);
      
      console.log('Таблица posts_tracks создана');
    }
    
    // Получаем последний пост
    const lastPost = await AppDataSource.getRepository(Post)
      .createQueryBuilder('post')
      .orderBy('post.id', 'DESC')
      .getOne();
      
    if (!lastPost) {
      console.log('Посты не найдены');
      return;
    }
    
    console.log('Последний пост:', lastPost);
    
    // Получаем первый трек
    const firstTrack = await AppDataSource.getRepository(MusicTrack)
      .createQueryBuilder('track')
      .getOne();
      
    if (!firstTrack) {
      console.log('Треки не найдены');
      return;
    }
    
    console.log('Трек для связи:', firstTrack);
    
    // Создаем связь между последним постом и первым треком
    try {
      await AppDataSource.query(
        `INSERT INTO posts_tracks ("postId", "trackId") VALUES ($1, $2) 
         ON CONFLICT ("postId", "trackId") DO NOTHING`,
        [lastPost.id, firstTrack.id]
      );
      
      console.log(`Связь создана между постом ${lastPost.id} и треком ${firstTrack.id}`);
    } catch (error) {
      console.error('Ошибка при создании связи:', error);
    }
    
    // Проверяем, создалась ли связь
    const relation = await AppDataSource.query(
      `SELECT * FROM posts_tracks WHERE "postId" = $1 AND "trackId" = $2`,
      [lastPost.id, firstTrack.id]
    );
    
    console.log('Результат проверки связи:', relation);
    
    // Получаем все связи
    const allRelations = await AppDataSource.query(
      `SELECT * FROM posts_tracks`
    );
    
    console.log('Все связи в таблице posts_tracks:', allRelations);
    
  } catch (error) {
    console.error('Ошибка:', error);
  } finally {
    // Закрываем соединение
    await AppDataSource.destroy();
    console.log('Соединение с БД закрыто');
  }
}

fixPostTrackRelation().catch(console.error); 