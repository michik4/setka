import { Request, Response } from 'express';
import { Post } from '../entities/post.entity';
import { AppDataSource } from '../db/db_connect';
import { Photo } from '../entities/photo.entity';
import { Like } from '../entities/like.entity';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { WallPost } from '../entities/wall.entity';
import { Album } from '../entities/album.entity';
import { PostAlbum } from '../entities/post_album.entity';
import { MusicTrack } from '../entities/music.entity';

export class PostController {
    private get postRepository() {
        return AppDataSource.getRepository(Post);
    }

    private get likeRepository() {
        return AppDataSource.getRepository(Like);
    }

    private get wallPostRepository() {
        return AppDataSource.getRepository(WallPost);
    }

    private get musicTrackRepository() {
        return AppDataSource.getRepository(MusicTrack);
    }

    // Получение сохраненного поста со всеми связями
    private async getPostWithRelations(postId: number) {
        try {
            // Получаем пост с основными связями
            const post = await this.postRepository
                .createQueryBuilder('post')
                .leftJoinAndSelect('post.author', 'author')
                .leftJoinAndSelect('author.avatar', 'authorAvatar')
                .leftJoinAndSelect('post.photos', 'photos')
                .leftJoinAndSelect('post.tracks', 'tracks')
                .select([
                    'post.id',
                    'post.content',
                    'post.authorId',
                    'post.likesCount',
                    'post.commentsCount',
                    'post.sharesCount',
                    'post.viewsCount',
                    'post.createdAt',
                    'post.updatedAt',
                    'author.id',
                    'author.firstName',
                    'author.lastName',
                    'author.nickname',
                    'author.email',
                    'authorAvatar.id',
                    'authorAvatar.path',
                    'photos.id',
                    'photos.filename',
                    'photos.path',
                    'tracks.id',
                    'tracks.title',
                    'tracks.artist',
                    'tracks.duration',
                    'tracks.filename',
                    'tracks.coverUrl'
                ])
                .where('post.id = :id', { id: postId })
                .getOne();
                
            if (post) {
                try {
                    // Загружаем альбомы напрямую через SQL-запрос
                    const albumsQuery = await AppDataSource.query(`
                        SELECT a.* FROM album a
                        JOIN post_album pa ON a.id = pa."albumId"
                        WHERE pa."postId" = $1
                    `, [postId]);
                    
                    if (albumsQuery && albumsQuery.length > 0) {
                        console.log(`Загружено ${albumsQuery.length} альбомов для поста ${postId}`);
                        
                        // Загружаем фотографии для каждого альбома
                        for (const album of albumsQuery) {
                            const photosQuery = await AppDataSource.query(`
                                SELECT p.* FROM photo p
                                JOIN album_photo ap ON p.id = ap."photoId"
                                WHERE ap."albumId" = $1
                                LIMIT 5
                            `, [album.id]);
                            
                            album.photos = photosQuery || [];
                        }
                        
                        // Добавляем albums к посту
                        (post as any).albums = albumsQuery;
                    } else {
                        console.log(`Не найдено альбомов для поста ${postId}`);
                        (post as any).albums = [];
                    }
                } catch (error) {
                    console.error('Ошибка при загрузке альбомов:', error);
                    (post as any).albums = [];
                }

                // Преобразуем пути к аудиофайлам для каждого трека
                if (post.tracks && post.tracks.length > 0) {
                    console.log(`[PostController] Найдено ${post.tracks.length} треков для поста ${postId}:`, 
                      post.tracks.map(t => ({ id: t.id, title: t.title, filename: t.filename })));
                    
                    post.tracks = post.tracks.map(track => {
                        // Проверим, что у нас есть имя файла
                        if (!track.filename) {
                            console.error(`[PostController] Трек с ID ${track.id} не имеет имени файла! Детали трека:`, track);
                            // Добавляем пустой audioUrl для предотвращения ошибок на клиенте
                            return {
                                ...track,
                                audioUrl: ''
                            };
                        }
                        
                        // Создаем URL для аудио
                        const audioUrl = `/api/music/file/${track.filename}`;
                        console.log(`[PostController] Добавлен URL для трека ${track.id}: ${audioUrl}`);
                        
                        return {
                            ...track,
                            audioUrl
                        };
                    });
                    
                    // Проверяем, что у всех треков есть audioUrl
                    for (const track of post.tracks) {
                        const trackWithAudio = track as any;
                        if (!trackWithAudio.audioUrl) {
                            console.error(`[PostController] ОШИБКА: Трек ${track.id} не имеет audioUrl после обработки!`);
                            trackWithAudio.audioUrl = `/api/music/file/${track.filename || 'unknown'}`; 
                        }
                    }
                } else {
                    console.log(`[PostController] Не найдено треков для поста ${postId}`);
                }
            }
            
            return post;
        } catch (error) {
            console.error(`Ошибка при получении поста ${postId}:`, error);
            return null;
        }
    }

    // Получение всех постов
    public getAllPosts = async (req: Request, res: Response): Promise<void> => {
        try {
            console.log('[PostController] Запрос на получение всех постов');
            
            const postsQuery = await this.postRepository
                .createQueryBuilder('post')
                .leftJoinAndSelect('post.author', 'author')
                .leftJoinAndSelect('author.avatar', 'authorAvatar')
                .leftJoinAndSelect('post.photos', 'photos')
                .leftJoinAndSelect('post.tracks', 'tracks')
                .select([
                    'post.id',
                    'post.content',
                    'post.authorId',
                    'post.likesCount',
                    'post.commentsCount',
                    'post.sharesCount',
                    'post.viewsCount',
                    'post.createdAt',
                    'post.updatedAt',
                    'author.id',
                    'author.firstName',
                    'author.lastName',
                    'author.nickname',
                    'author.email',
                    'authorAvatar.id',
                    'authorAvatar.path',
                    'photos.id',
                    'photos.filename',
                    'photos.path',
                    'tracks.id',
                    'tracks.title',
                    'tracks.artist',
                    'tracks.duration',
                    'tracks.filename',
                    'tracks.coverUrl'
                ])
                .orderBy('post.createdAt', 'DESC')
                .getMany();
                
            // Для каждого поста загружаем альбомы и обрабатываем треки
            const posts = [];
            try {
                for (const post of postsQuery) {
                    const postWithAlbums = await this.getPostWithRelations(post.id);
                    if (postWithAlbums) {
                        posts.push(postWithAlbums);
                    } else {
                        // Если не удалось загрузить с отношениями, добавляем базовый пост
                        // и обрабатываем треки
                        const basicPost = {...post, albums: []};
                        
                        // Добавляем audioUrl к каждому треку
                        if (basicPost.tracks && basicPost.tracks.length > 0) {
                            basicPost.tracks = basicPost.tracks.map(track => ({
                                ...track,
                                audioUrl: `/api/music/file/${track.filename}`
                            }));
                        }
                        
                        posts.push(basicPost);
                    }
                }
            } catch (error) {
                console.error('Ошибка при загрузке альбомов и треков для постов:', error);
                
                // В случае ошибки добавляем посты с минимальной обработкой
                for (const post of postsQuery) {
                    const basicPost = {...post, albums: []};
                    
                    if (basicPost.tracks && basicPost.tracks.length > 0) {
                        basicPost.tracks = basicPost.tracks.map(track => ({
                            ...track,
                            audioUrl: `/api/music/file/${track.filename}`
                        }));
                    }
                    
                    posts.push(basicPost);
                }
            }

            console.log(`[PostController] Найдено ${posts.length} постов`);
            res.json(posts);
        } catch (error) {
            console.error('[PostController] Ошибка при получении постов:', error);
            res.status(500).json({ message: 'Ошибка при получении постов', error });
        }
    };

    // Получение поста по ID
    public getPostById = async (req: Request, res: Response): Promise<void> => {
        try {
            const id = Number(req.params.id);
            console.log(`[PostController] Запрос на получение поста по ID: ${id}`);
            
            const post = await this.getPostWithRelations(id);
            
            if (!post) {
                console.log(`[PostController] Пост с ID ${id} не найден`);
                res.status(404).json({ message: 'Пост не найден' });
                return;
            }
            
            console.log(`[PostController] Найден пост с ID ${id}`);
            res.json(post);
        } catch (error) {
            console.error('[PostController] Ошибка при получении поста:', error);
            res.status(500).json({ message: 'Ошибка при получении поста', error });
        }
    };

    // Создание нового поста
    public createPost = async (req: Request, res: Response): Promise<void> => {
        console.log('*****************************************');
        console.log('[PostController] НАЧАЛО СОЗДАНИЯ ПОСТА');
        console.log('*****************************************');
        try {
            console.log('[PostController] Body поста:', JSON.stringify(req.body, null, 2));
            console.log('[PostController] Файлы:', req.files);
            
            // Проверяем существование таблицы posts_tracks
            try {
                const tableExists = await AppDataSource.query(`
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public'
                        AND table_name = 'posts_tracks'
                    );
                `);
                console.log('[PostController] Таблица posts_tracks существует:', tableExists[0].exists);
                
                // Также проверяем существование таблицы music_tracks
                const musicTableExists = await AppDataSource.query(`
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public'
                        AND table_name = 'music_tracks'
                    );
                `);
                console.log('[PostController] Таблица music_tracks существует:', musicTableExists[0].exists);
                
                // Если нет таблицы music_tracks, создаем её
                if (!musicTableExists[0].exists) {
                    console.log('[PostController] Таблица music_tracks не существует. Создаем...');
                    
                    await AppDataSource.query(`
                        CREATE TABLE music_tracks (
                            id SERIAL PRIMARY KEY,
                            title VARCHAR(255) NOT NULL,
                            artist VARCHAR(255) NOT NULL,
                            duration VARCHAR(255) NOT NULL,
                            filename VARCHAR(255) NOT NULL,
                            filepath VARCHAR(255) NOT NULL,
                            "coverUrl" VARCHAR(255),
                            "playCount" INT DEFAULT 0,
                            "userId" INT NOT NULL,
                            "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
                            "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
                            CONSTRAINT fk_user FOREIGN KEY ("userId") REFERENCES users(id)
                        );
                    `);
                    
                    console.log('[PostController] Таблица music_tracks успешно создана');
                }
                
                // Если таблица не существует, создаем её
                if (!tableExists[0].exists) {
                    console.log('[PostController] Таблица posts_tracks не существует. Создаем...');
                    
                    await AppDataSource.query(`
                        CREATE TABLE posts_tracks (
                            "postId" integer NOT NULL,
                            "trackId" integer NOT NULL,
                            CONSTRAINT "PK_posts_tracks" PRIMARY KEY ("postId", "trackId"),
                            CONSTRAINT "FK_posts_tracks_post" FOREIGN KEY ("postId") 
                                REFERENCES "posts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
                            CONSTRAINT "FK_posts_tracks_track" FOREIGN KEY ("trackId") 
                                REFERENCES "music_tracks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
                        );
                    `);
                    
                    console.log('[PostController] Таблица posts_tracks успешно создана');
                    
                    // Проверяем, что таблица создалась успешно
                    const checkTableExists = await AppDataSource.query(`
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables 
                            WHERE table_schema = 'public'
                            AND table_name = 'posts_tracks'
                        );
                    `);
                    
                    console.log('[PostController] Проверка: таблица posts_tracks создана:', checkTableExists[0].exists);
                }
                
                // Проверяем структуру таблицы, если она существует
                if (tableExists[0].exists) {
                    const tableStructure = await AppDataSource.query(`
                        SELECT column_name, data_type, is_nullable
                        FROM information_schema.columns 
                        WHERE table_name = 'posts_tracks';
                    `);
                    console.log('[PostController] Структура таблицы posts_tracks:', tableStructure);
                    
                    // Проверяем наличие внешних ключей
                    const foreignKeys = await AppDataSource.query(`
                        SELECT
                            tc.constraint_name,
                            tc.table_name,
                            kcu.column_name,
                            ccu.table_name AS foreign_table_name,
                            ccu.column_name AS foreign_column_name
                        FROM
                            information_schema.table_constraints AS tc
                            JOIN information_schema.key_column_usage AS kcu
                              ON tc.constraint_name = kcu.constraint_name
                            JOIN information_schema.constraint_column_usage AS ccu
                              ON ccu.constraint_name = tc.constraint_name
                        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'posts_tracks';
                    `);
                    console.log('[PostController] Внешние ключи таблицы posts_tracks:', foreignKeys);
                    
                    // Если нет внешних ключей, добавляем их
                    if (foreignKeys.length === 0) {
                        console.log('[PostController] Внешние ключи отсутствуют. Добавляем...');
                        
                        try {
                            // Добавляем внешний ключ для postId
                            await AppDataSource.query(`
                                ALTER TABLE posts_tracks 
                                ADD CONSTRAINT "FK_posts_tracks_post" 
                                FOREIGN KEY ("postId") REFERENCES posts(id) 
                                ON DELETE CASCADE ON UPDATE CASCADE;
                            `);
                            
                            // Добавляем внешний ключ для trackId
                            await AppDataSource.query(`
                                ALTER TABLE posts_tracks 
                                ADD CONSTRAINT "FK_posts_tracks_track" 
                                FOREIGN KEY ("trackId") REFERENCES music_tracks(id) 
                                ON DELETE CASCADE ON UPDATE CASCADE;
                            `);
                            
                            console.log('[PostController] Внешние ключи успешно добавлены');
                        } catch (fkError) {
                            console.error('[PostController] Ошибка при добавлении внешних ключей:', fkError);
                            // Продолжаем выполнение, даже если не удалось добавить внешние ключи
                        }
                    }
                }
            } catch (tableError) {
                console.error('[PostController] Ошибка при проверке таблицы posts_tracks:', tableError);
            }
            
            const { content, authorId, photoIds, albumIds, trackIds, trackId } = req.body;
            
            console.log('[PostController] Полученные данные треков:');
            console.log('- trackIds:', trackIds, typeof trackIds, Array.isArray(trackIds));
            console.log('- trackId:', trackId, typeof trackId);
            
            // Собираем все ID треков в один массив
            let allTrackIds: any[] = [];
            
            // Обрабатываем trackIds
            if (trackIds) {
                let parsedTrackIds = trackIds;
                if (typeof trackIds === 'string') {
                    try {
                        parsedTrackIds = JSON.parse(trackIds);
                        console.log('[PostController] Удалось распарсить trackIds из строки:', parsedTrackIds);
                    } catch (e) {
                        console.error('[PostController] Ошибка при парсинге trackIds:', e);
                        // Если это одиночное значение, пробуем превратить его в массив
                        if (!isNaN(Number(trackIds))) {
                            parsedTrackIds = [Number(trackIds)];
                            console.log('[PostController] Преобразовано в массив из одного элемента:', parsedTrackIds);
                        }
                    }
                }
                
                if (Array.isArray(parsedTrackIds)) {
                    allTrackIds = [...allTrackIds, ...parsedTrackIds];
                }
            }
            
            // Добавляем trackId, если он есть
            if (trackId) {
                const parsedTrackId = Number(trackId);
                if (!isNaN(parsedTrackId) && !allTrackIds.includes(parsedTrackId)) {
                    allTrackIds.push(parsedTrackId);
                }
            }
            
            console.log('[PostController] Итоговый список ID треков:', allTrackIds);
            
            let albums = req.body.albums;
            
            // Проверяем, есть ли albums в JSON формате и преобразуем его
            if (albums && typeof albums === 'string') {
                try {
                    albums = JSON.parse(albums);
                } catch (error) {
                    console.error('Ошибка при парсинге JSON albums:', error);
                }
            }
            
            const photos = req.files as Express.Multer.File[];
            
            // Создаем новый пост
            const post = new Post();
            post.content = content;
            post.authorId = Number(authorId);
            
            // Устанавливаем заглушки для счетчиков
            post.likesCount = 0;
            post.commentsCount = 0;
            post.sharesCount = 0;
            post.viewsCount = 0;
            
            // Загружаем пользователя для установки автора
            post.author = await AppDataSource.manager.findOne('User', {
                where: { id: Number(authorId) }
            }) as any;
            
            // Сохраняем пост в базу
            const savedPost = await this.postRepository.save(post);
            console.log('[PostController] Сохранен пост:', savedPost);
            
            // Обрабатываем добавление фотографий
            if (Array.isArray(photoIds) && photoIds.length > 0) {
                const photosEntities = await AppDataSource.manager.find('Photo', {
                    where: photoIds.map(id => ({ id: Number(id) }))
                }) as Photo[];
                
                if (photosEntities.length > 0) {
                    savedPost.photos = photosEntities;
                    await this.postRepository.save(savedPost);
                    console.log(`[PostController] Добавлено ${photosEntities.length} фотографий к посту ${savedPost.id}`);
                }
            }
            
            // Обрабатываем добавление музыкальных треков - ИСПОЛЬЗУЕМ ТОЛЬКО ORM
            if (Array.isArray(allTrackIds) && allTrackIds.length > 0) {
                console.log(`[PostController] Начинаем добавление ${allTrackIds.length} треков к посту ${savedPost.id}`, allTrackIds);
                
                try {
                    // Проверяем доступные треки в базе данных
                    console.log('[PostController] Проверка доступных треков в базе данных...');
                    const allTracks = await this.musicTrackRepository.find();
                    console.log(`[PostController] В базе данных найдено ${allTracks.length} треков:`);
                    if (allTracks.length > 0) {
                        console.log(allTracks.map(t => ({ id: t.id, title: t.title, artist: t.artist })));
                    } else {
                        console.log('[PostController] В базе данных нет треков!');
                    }
                    
                    // Преобразуем все ID в числа для безопасного поиска
                    const trackIdsNumbers = allTrackIds
                        .map(id => Number(id))
                        .filter(id => !isNaN(id));
                    
                    console.log(`[PostController] Преобразованные ID треков: ${JSON.stringify(trackIdsNumbers)}`);
                    
                    // Находим треки по ID
                    const trackEntities = await this.musicTrackRepository.findBy(
                        trackIdsNumbers.map(id => ({ id }))
                    );
                    
                    console.log(`[PostController] Найдено ${trackEntities.length} треков из ${trackIdsNumbers.length} запрошенных`);
                    console.log('[PostController] Найденные треки:', trackEntities.map(t => ({ id: t.id, title: t.title, artist: t.artist })));
                    
                    if (trackEntities.length > 0) {
                        // Проверим состояние поста до добавления треков
                        console.log(`[PostController] Состояние поста ДО добавления треков:`, {
                            id: savedPost.id,
                            hasTracks: !!savedPost.tracks,
                            tracksCount: savedPost.tracks?.length || 0
                        });
                        
                        // Присваиваем треки к посту через ORM
                        savedPost.tracks = trackEntities;
                        
                        console.log(`[PostController] Присвоены треки к посту:`, {
                            postId: savedPost.id, 
                            tracksAssigned: savedPost.tracks.length,
                            tracksDetails: savedPost.tracks.map(t => ({ id: t.id, title: t.title }))
                        });
                        
                        // Сохраняем обновленный пост с треками
                        const updatedPost = await this.postRepository.save(savedPost);
                        
                        console.log(`[PostController] Результат сохранения поста:`, {
                            id: updatedPost.id,
                            hasTracks: !!updatedPost.tracks,
                            tracksCount: updatedPost.tracks?.length || 0
                        });
                        
                        console.log(`[PostController] Добавлено ${trackEntities.length} треков к посту ${savedPost.id} через ORM`);
                        
                        // Проверим SQL запросы напрямую
                        try {
                            const trackRelations = await AppDataSource.query(
                                `SELECT * FROM posts_tracks WHERE "postId" = $1`,
                                [savedPost.id]
                            );
                            console.log(`[PostController] Связи в таблице posts_tracks:`, trackRelations);
                        } catch (sqlError) {
                            console.error(`[PostController] Ошибка при проверке связей:`, sqlError);
                        }
                    } else {
                        console.log(`[PostController] Не найдено треков для добавления к посту`);
                    }
                    
                    // Проверяем, добавились ли треки
                    const postWithTracks = await this.postRepository.findOne({
                        where: { id: savedPost.id },
                        relations: ['tracks']
                    });
                    
                    console.log(`[PostController] Проверка добавления треков:`, {
                        postId: savedPost.id, 
                        hasTracks: !!postWithTracks?.tracks,
                        tracksCount: postWithTracks?.tracks?.length || 0,
                        tracks: postWithTracks?.tracks?.map(t => ({ id: t.id, title: t.title })) || 'Треки не добавлены'
                    });
                } catch (error) {
                    console.error(`[PostController] Ошибка при добавлении треков:`, error);
                }
            } else {
                console.log(`[PostController] Нет треков для добавления к посту`);
            }
            
            // Обрабатываем альбомы
            if (Array.isArray(albumIds) && albumIds.length > 0) {
                for (const albumId of albumIds) {
                    const postAlbum = new PostAlbum();
                    postAlbum.postId = savedPost.id;
                    postAlbum.albumId = Number(albumId);
                    await AppDataSource.manager.save(postAlbum);
                }
                console.log(`[PostController] Добавлено ${albumIds.length} альбомов к посту ${savedPost.id}`);
            }
            
            // Возвращаем пост со всеми связями
            const fullPost = await this.getPostWithRelations(savedPost.id);
            console.log(`[PostController] Финальный пост с отношениями:`, {
                id: fullPost?.id,
                content: fullPost?.content,
                hasTracks: fullPost?.tracks && fullPost.tracks.length > 0,
                tracksCount: fullPost?.tracks?.length,
                tracks: fullPost?.tracks?.map(t => ({ id: t.id, title: t.title }))
            });
            
            res.status(201).json(fullPost);
        } catch (error) {
            console.error('[PostController] Ошибка при создании поста:', error);
            res.status(500).json({ message: 'Ошибка при создании поста', error });
        }
    };

    // Обновление поста
    public updatePost = async (req: Request, res: Response): Promise<void> => {
        try {
            const id = Number(req.params.id);
            const { content, photoIds, trackIds } = req.body;
            
            console.log(`[PostController] Обновление поста ${id}`);
            console.log('Новый контент:', content);
            console.log('Новые ID фотографий:', photoIds);
            console.log('Новые ID треков:', trackIds);
            
            // Находим пост
            const post = await this.postRepository.findOne({
                where: { id },
                relations: ['photos', 'tracks']
            });
            
            if (!post) {
                res.status(404).json({ message: 'Пост не найден' });
                return;
            }
            
            post.content = content;
            
            // Обрабатываем изменение фотографий
            if (Array.isArray(photoIds)) {
                const photos = await AppDataSource.manager.find('Photo', {
                    where: photoIds.map(id => ({ id: Number(id) }))
                }) as Photo[];
                post.photos = photos;
                console.log(`[PostController] Установлено ${photos.length} фотографий для поста ${id}`);
            }
            
            // Обрабатываем изменение треков
            if (Array.isArray(trackIds)) {
                // Преобразуем ID в числа и отфильтруем невалидные значения
                const validTrackIds = trackIds
                    .map(id => Number(id))
                    .filter(id => !isNaN(id));
                
                console.log(`[PostController] Поиск ${validTrackIds.length} треков для обновления поста ${id}`);
                
                // Находим треки по ID
                const tracks = await this.musicTrackRepository.findBy(
                    validTrackIds.map(id => ({ id }))
                );
                
                console.log(`[PostController] Найдено ${tracks.length} треков из ${validTrackIds.length}`);
                
                // Присваиваем треки посту
                post.tracks = tracks;
                console.log(`[PostController] Установлено ${tracks.length} треков для поста ${id}`);
            }
            
            // Сохраняем изменения
            await this.postRepository.save(post);
            console.log(`[PostController] Пост ${id} успешно обновлен`);
            
            // Загружаем полный пост со всеми связями
            const updatedPost = await this.getPostWithRelations(id);
            res.json(updatedPost);
        } catch (error) {
            console.error('[PostController] Ошибка при обновлении поста:', error);
            res.status(500).json({ message: 'Ошибка при обновлении поста', error });
        }
    };

    // Удаление поста
    public deletePost = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            
            const post = await this.postRepository.findOne({
                where: { id: Number(id) }
            });
            
            if (!post) {
                res.status(404).json({ message: 'Пост не найден' });
                return;
            }
            
            await this.postRepository.delete(id);
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ message: 'Ошибка при удалении поста', error });
        }
    };

    // Получение постов пользователя
    public getUserPosts = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = Number(req.params.userId);
            console.log(`[PostController] Запрос на получение постов пользователя: ${userId}`);
            
            const postsQuery = await this.postRepository
                .createQueryBuilder('post')
                .leftJoinAndSelect('post.author', 'author')
                .leftJoinAndSelect('author.avatar', 'authorAvatar')
                .leftJoinAndSelect('post.photos', 'photos')
                .leftJoinAndSelect('post.tracks', 'tracks')
                .select([
                    'post.id',
                    'post.content',
                    'post.authorId',
                    'post.likesCount',
                    'post.commentsCount',
                    'post.sharesCount',
                    'post.viewsCount',
                    'post.createdAt',
                    'post.updatedAt',
                    'author.id',
                    'author.firstName',
                    'author.lastName',
                    'author.nickname',
                    'author.email',
                    'authorAvatar.id',
                    'authorAvatar.path',
                    'photos.id',
                    'photos.filename',
                    'photos.path',
                    'tracks.id',
                    'tracks.title',
                    'tracks.artist',
                    'tracks.duration',
                    'tracks.filename',
                    'tracks.coverUrl'
                ])
                .where('post.authorId = :userId', { userId })
                .orderBy('post.createdAt', 'DESC')
                .getMany();
            
            // Для каждого поста загружаем альбомы и обрабатываем треки
            const posts = [];
            try {
                for (const post of postsQuery) {
                    const postWithRelations = await this.getPostWithRelations(post.id);
                    if (postWithRelations) {
                        posts.push(postWithRelations);
                    } else {
                        // Если не удалось загрузить с отношениями, добавляем базовый пост
                        // и обрабатываем треки
                        const basicPost = {...post, albums: []};
                        
                        // Добавляем audioUrl к каждому треку
                        if (basicPost.tracks && basicPost.tracks.length > 0) {
                            basicPost.tracks = basicPost.tracks.map(track => ({
                                ...track,
                                audioUrl: `/api/music/file/${track.filename}`
                            }));
                        }
                        
                        posts.push(basicPost);
                    }
                }
            } catch (error) {
                console.error('Ошибка при загрузке альбомов и треков для постов пользователя:', error);
                
                // В случае ошибки добавляем посты с минимальной обработкой
                for (const post of postsQuery) {
                    const basicPost = {...post, albums: []};
                    
                    if (basicPost.tracks && basicPost.tracks.length > 0) {
                        basicPost.tracks = basicPost.tracks.map(track => ({
                            ...track,
                            audioUrl: `/api/music/file/${track.filename}`
                        }));
                    }
                    
                    posts.push(basicPost);
                }
            }
            
            console.log(`[PostController] Найдено ${posts.length} постов пользователя ${userId}`);
            res.json(posts);
        } catch (error) {
            console.error('[PostController] Ошибка при получении постов пользователя:', error);
            res.status(500).json({ message: 'Ошибка при получении постов пользователя', error });
        }
    };

    // Поставить/убрать лайк посту
    public toggleLike = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const postId = Number(req.params.id);
            const userId = req.user.id;

            console.log(`[PostController] Запрос на установку/снятие лайка для поста ${postId} от пользователя ${userId}`);

            // Проверяем существование поста
            const post = await AppDataSource
                .getRepository(WallPost)
                .createQueryBuilder("Post")
                .where("Post.id = :id", { id: postId })
                .getOne();

            if (!post) {
                console.log(`[PostController] Пост с ID ${postId} не найден`);
                res.status(404).json({ message: 'Пост не найден' });
                return;
            }

            console.log(`[PostController] Пост найден, проверяем существующий лайк`);

            // Проверяем, есть ли уже лайк
            const existingLike = await this.likeRepository.findOne({
                where: { userId, wallPostId: postId }
            });

            let response;
            if (existingLike) {
                console.log(`[PostController] Лайк найден, удаляем`);
                // Если лайк есть - удаляем его
                await this.likeRepository.remove(existingLike);
                post.likesCount = Math.max(0, post.likesCount - 1);
                await AppDataSource.getRepository(WallPost).save(post);
                response = { liked: false, likesCount: post.likesCount };
            } else {
                console.log(`[PostController] Лайк не найден, создаем новый`);
                // Если лайка нет - создаем
                const newLike = this.likeRepository.create({
                    userId: userId,
                    wallPostId: postId
                });
                await this.likeRepository.save(newLike);
                post.likesCount++;
                await AppDataSource.getRepository(WallPost).save(post);
                response = { liked: true, likesCount: post.likesCount };
            }

            console.log(`[PostController] Отправляем ответ:`, response);
            res.json(response);
        } catch (error) {
            console.error('[PostController] Ошибка при обработке лайка:', error);
            const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
            res.status(500).json({ message: 'Ошибка при обработке лайка', error: errorMessage });
        }
    };

    // Проверить, лайкнул ли пользователь пост
    public checkLike = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            console.log('[PostController] Запрос на проверку лайка');
            const postId = Number(req.params.id);
            const userId = req.user.id;

            console.log(`[PostController] Проверка лайка для поста ${postId} от пользователя ${userId}`);

            // Проверяем, является ли пост записью на стене
            const wallPost = await AppDataSource
                .getRepository(WallPost)
                .createQueryBuilder("Post")
                .where("Post.id = :id", { id: postId })
                .getOne();

            const like = await this.likeRepository.findOne({
                where: wallPost ? { userId, wallPostId: postId } : { userId, postId }
            });

            const likesCount = wallPost ? wallPost.likesCount : 0;

            console.log(`[PostController] Результат проверки:`, {
                liked: Boolean(like),
                likesCount
            });
            
            res.json({ liked: Boolean(like), likesCount });
        } catch (error) {
            console.error('[PostController] Ошибка при проверке лайка:', error);
            res.status(500).json({ message: 'Ошибка при проверке лайка' });
        }
    };

    // Получение постов с определенной фотографией
    public getPostsWithPhoto = async (req: Request, res: Response): Promise<void> => {
        try {
            const { photoId } = req.params;

            // Получаем обычные посты с этой фотографией
            const posts = await this.postRepository
                .createQueryBuilder('post')
                .leftJoinAndSelect('post.photos', 'photos')
                .leftJoinAndSelect('post.tracks', 'tracks')
                .leftJoinAndSelect('post.author', 'author')
                .leftJoinAndSelect('author.avatar', 'authorAvatar')
                .where('photos.id = :photoId', { photoId })
                .getMany();

            // Получаем записи на стене с этой фотографией
            const wallPosts = await this.wallPostRepository
                .createQueryBuilder('wallPost')
                .leftJoinAndSelect('wallPost.photos', 'photos')
                .leftJoinAndSelect('wallPost.author', 'author')
                .leftJoinAndSelect('author.avatar', 'authorAvatar')
                .where('photos.id = :photoId', { photoId })
                .getMany();

            // Обрабатываем треки для обычных постов
            const processedPosts = posts.map(post => {
                if (post.tracks && post.tracks.length > 0) {
                    post.tracks = post.tracks.map(track => ({
                        ...track,
                        audioUrl: `/api/music/file/${track.filename}`
                    }));
                }
                return post;
            });

            // Объединяем результаты
            const allPosts = [...processedPosts, ...wallPosts];
            
            res.json(allPosts);
        } catch (error) {
            console.error('[PostController] Ошибка при получении постов с фотографией:', error);
            res.status(500).json({ message: 'Ошибка при получении постов', error });
        }
    };

    // Метод для создания связи между постом и треком напрямую через SQL
    private async createPostTrackRelation(postId: number, trackId: number): Promise<void> {
        try {
            // Проверяем входные данные
            if (!postId || !trackId) {
                console.error(`[PostController] Неверные данные для создания связи поста и трека: postId=${postId}, trackId=${trackId}`);
                return;
            }
            
            console.log(`[PostController] Создание связи между постом ${postId} и треком ${trackId}`);
            
            // Проверяем существование связи
            const existingRelation = await AppDataSource.query(
                `SELECT * FROM posts_tracks WHERE "postId" = $1 AND "trackId" = $2`,
                [postId, trackId]
            );
            
            if (existingRelation && existingRelation.length > 0) {
                console.log(`[PostController] Связь между постом ${postId} и треком ${trackId} уже существует`);
                return;
            }
            
            try {
                // Создаем связь через SQL-запрос
                await AppDataSource.query(
                    `INSERT INTO posts_tracks ("postId", "trackId") VALUES ($1, $2)`,
                    [postId, trackId]
                );
                
                console.log(`[PostController] Создана связь между постом ${postId} и треком ${trackId} напрямую через SQL`);
                
                // Проверяем, что связь действительно создалась
                const checkRelation = await AppDataSource.query(
                    `SELECT * FROM posts_tracks WHERE "postId" = $1 AND "trackId" = $2`,
                    [postId, trackId]
                );
                
                if (checkRelation && checkRelation.length > 0) {
                    console.log(`[PostController] Проверка: связь между постом ${postId} и треком ${trackId} успешно создана`);
                } else {
                    console.error(`[PostController] Проверка: связь между постом ${postId} и треком ${trackId} НЕ СОЗДАНА!`);
                }
            } catch (sqlError) {
                console.error(`[PostController] SQL ошибка при создании связи между постом ${postId} и треком ${trackId}:`, sqlError);
                throw sqlError;
            }
        } catch (error) {
            console.error(`[PostController] Ошибка при создании связи между постом ${postId} и треком ${trackId}:`, error);
            throw error;
        }
    }
} 