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
import { In } from 'typeorm';

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
                    'tracks.coverUrl',
                ])
                .where('post.id = :id', { id: postId })
                .getOne();
                
            if (post) {
                // Загружаем альбомы через SQL-запрос для этого поста
                console.log(`[PostController] Загружаем альбомы для поста ${postId} через SQL`);
                const albumsQuery = await AppDataSource.query(`
                    SELECT a.* FROM albums a 
                    JOIN post_album pa ON a.id = pa."albumId"
                    WHERE pa."postId" = $1
                `, [postId]);
                
                if (albumsQuery && albumsQuery.length > 0) {
                    console.log(`[PostController] Найдено ${albumsQuery.length} альбомов для поста ${postId}`);
                    
                    // Обрабатываем альбомы
                    const albums = albumsQuery.map((album: any) => {
                        album.id = Number(album.id);
                        album.userId = Number(album.userId);
                        album.photosCount = Number(album.photosCount);
                        album.isPrivate = album.isPrivate === true || album.isPrivate === 'true';
                        return album;
                    });
                    
                    post.albums = albums;
                    
                    // Если альбом один, добавляем флаг для полной ширины
                    if (albums.length === 1) {
                        (albums[0] as any).isFullWidth = true;
                    }
                    
                    // Загружаем фотографии для каждого альбома
                    for (const album of albums) {
                        try {
                            // Получаем актуальное количество фотографий для альбома
                            const photoCountResult = await AppDataSource.query(`
                                SELECT COUNT(*) as count FROM album_photos
                                WHERE "albumId" = $1
                            `, [album.id]);
                            
                            // Устанавливаем актуальное количество фотографий
                            const actualPhotoCount = parseInt(photoCountResult[0].count, 10);
                            album.photosCount = actualPhotoCount;
                            
                            console.log(`Альбом ${album.id}: актуальное количество фотографий = ${actualPhotoCount}`);
                            
                            // Загружаем превью фотографий для альбома (до 5 штук)
                            const photosQuery = await AppDataSource.query(`
                                SELECT p.* FROM photos p
                                JOIN album_photos ap ON p.id = ap."photoId"
                                WHERE ap."albumId" = $1
                                ORDER BY p.id DESC
                                LIMIT 5
                            `, [album.id]);
                            
                            // Обрабатываем фотографии
                            if (photosQuery && photosQuery.length > 0) {
                                const processedPhotos = photosQuery.map((photo: any) => {
                                    photo.id = Number(photo.id);
                                    return photo;
                                });
                                
                                // Записываем фотографии в альбом
                                (album as any).photos = processedPhotos;
                                
                                // Добавляем coverPhoto из первой фотографии
                                if (processedPhotos.length > 0) {
                                    (album as any).coverPhoto = processedPhotos[0];
                                }
                                
                                console.log(`Альбом ${album.id}: загружено ${processedPhotos.length} фото для превью`);
                            } else {
                                (album as any).photos = [];
                            }
                        } catch (error) {
                            console.error(`Ошибка при загрузке данных для альбома ${album.id}:`, error);
                            (album as any).photos = [];
                        }
                    }
                } else {
                    console.log(`Не найдено альбомов для поста ${postId}`);
                    post.albums = [];
                }
                
                // Для треков добавляем audioUrl
                if (post.tracks && post.tracks.length > 0) {
                    post.tracks = post.tracks.map((track: any) => ({
                        ...track,
                        audioUrl: `/api/music/file/${track.filename}`
                    }));
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
        
        try {
            // Получаем данные из тела запроса
            const {
                content,
                photoIds,
                albumIds,
                trackIds,
                trackId, // В случае одиночного трека
                authorId,
                groupId, // ID группы, если пост создается в группе
                wallOwnerId // ID хозяина стены, если пост создается на стене
            } = req.body;
            
            console.log('[PostController] Получены данные для создания поста:', {
                content,
                photoIds: typeof photoIds === 'string' ? 'JSON строка' : photoIds,
                albumIds: typeof albumIds === 'string' ? 'JSON строка' : albumIds,
                trackIds: typeof trackIds === 'string' ? 'JSON строка' : trackIds,
                trackId,
                authorId,
                groupId,
                wallOwnerId
            });
            
            // Преобразуем строки JSON в массивы
            let photoIdsArray: number[] = [];
            let albumIdsArray: number[] = [];
            let trackIdsArray: number[] = [];
            
            // Парсим photoIds
            if (photoIds) {
                if (Array.isArray(photoIds)) {
                    photoIdsArray = photoIds.map(id => Number(id));
                } else if (typeof photoIds === 'string') {
                    try {
                        photoIdsArray = JSON.parse(photoIds);
                        console.log('[PostController] Успешно распарсили photoIds из JSON:', photoIdsArray);
                    } catch (e) {
                        console.error('[PostController] Ошибка при парсинге photoIds:', e);
                        if (!isNaN(Number(photoIds))) {
                            photoIdsArray = [Number(photoIds)];
                        }
                    }
                }
            }
            
            // Парсим albumIds
            if (albumIds) {
                if (Array.isArray(albumIds)) {
                    albumIdsArray = albumIds.map(id => Number(id));
                } else if (typeof albumIds === 'string') {
                    try {
                        albumIdsArray = JSON.parse(albumIds);
                        console.log('[PostController] Успешно распарсили albumIds из JSON:', albumIdsArray);
                    } catch (e) {
                        console.error('[PostController] Ошибка при парсинге albumIds:', e);
                        if (!isNaN(Number(albumIds))) {
                            albumIdsArray = [Number(albumIds)];
                        }
                    }
                }
            }
            
            // Парсим trackIds
            if (trackIds) {
                if (Array.isArray(trackIds)) {
                    trackIdsArray = trackIds.map(id => Number(id));
                } else if (typeof trackIds === 'string') {
                    try {
                        trackIdsArray = JSON.parse(trackIds);
                        console.log('[PostController] Успешно распарсили trackIds из JSON:', trackIdsArray);
                    } catch (e) {
                        console.error('[PostController] Ошибка при парсинге trackIds:', e);
                        if (!isNaN(Number(trackIds))) {
                            trackIdsArray = [Number(trackIds)];
                        }
                    }
                }
            }
            
            // Добавляем trackId, если он есть
            if (trackId) {
                const parsedTrackId = Number(trackId);
                if (!isNaN(parsedTrackId) && !trackIdsArray.includes(parsedTrackId)) {
                    trackIdsArray.push(parsedTrackId);
                }
            }
            
            console.log('[PostController] Обработанные данные вложений:', {
                photoIds: photoIdsArray,
                albumIds: albumIdsArray,
                trackIds: trackIdsArray
            });
            
            // Проверяем ограничения на количество вложений
            if (albumIdsArray.length > 3) {
                console.log('[PostController] Превышено максимальное количество альбомов в посте (3)');
                albumIdsArray = albumIdsArray.slice(0, 3);
            }
            
            // Проверяем ограничение на количество треков
            if (trackIdsArray.length > 10) {
                console.log('[PostController] Превышено максимальное количество треков в посте (10)');
                trackIdsArray = trackIdsArray.slice(0, 10);
            }
            
            // Проверяем наличие содержимого или вложений
            if ((!content || content.trim() === '') && 
                photoIdsArray.length === 0 && 
                albumIdsArray.length === 0 && 
                trackIdsArray.length === 0) {
                console.log('[PostController] Пустой пост без контента и вложений, возвращаем ошибку 400');
                res.status(400).json({ 
                    message: "Пост должен содержать текст или вложения" 
                });
                return;
            }
            
            // Создаем новый пост
            const post = new Post();
            post.content = content || '';
            post.authorId = Number(authorId);
            
            // Устанавливаем groupId, если он передан
            if (groupId) {
                post.groupId = Number(groupId);
                console.log(`[PostController] Установлен groupId = ${post.groupId} для нового поста`);
            }
            
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
            if (photoIdsArray.length > 0) {
                console.log(`[PostController] Добавление ${photoIdsArray.length} фото к посту:`, photoIdsArray);
                
                const photosEntities = await AppDataSource.manager.find('Photo', {
                    where: photoIdsArray.map(id => ({ id: Number(id) }))
                }) as Photo[];
                
                console.log(`[PostController] Найдено ${photosEntities.length} фото из ${photoIdsArray.length}:`, 
                    photosEntities.map(p => p.id));
                
                if (photosEntities.length > 0) {
                    savedPost.photos = photosEntities;
                    await this.postRepository.save(savedPost);
                    console.log(`[PostController] Добавлено ${photosEntities.length} фотографий к посту ${savedPost.id}`);
                }
            }
            
            // Обрабатываем добавление музыкальных треков
            if (trackIdsArray.length > 0) {
                console.log(`[PostController] Начинаем добавление ${trackIdsArray.length} треков к посту ${savedPost.id}`, trackIdsArray);
                
                try {
                    // Находим треки по ID
                    const trackEntities = await this.musicTrackRepository.findBy(
                        trackIdsArray.map(id => ({ id }))
                    );
                    
                    console.log(`[PostController] Найдено ${trackEntities.length} треков из ${trackIdsArray.length} запрошенных`);
                    console.log('[PostController] Найденные треки:', trackEntities.map(t => ({ id: t.id, title: t.title, artist: t.artist })));
                    
                    if (trackEntities.length > 0) {
                        // Присваиваем треки к посту через ORM
                        savedPost.tracks = trackEntities;
                        
                        // Сохраняем обновленный пост с треками
                        const updatedPost = await this.postRepository.save(savedPost);
                        console.log(`[PostController] Добавлено ${trackEntities.length} треков к посту ${savedPost.id}`);
                    } else {
                        console.log(`[PostController] Не найдено треков для добавления к посту`);
                    }
                } catch (error) {
                    console.error(`[PostController] Ошибка при добавлении треков:`, error);
                }
            } else {
                console.log(`[PostController] Нет треков для добавления к посту`);
            }
            
            // Обрабатываем альбомы
            if (albumIdsArray.length > 0) {
                // Проверяем на превышение лимита альбомов
                if (albumIdsArray.length > 3) {
                    console.log(`[PostController] Превышено максимальное количество альбомов (3), обрезаем до первых 3`);
                    albumIdsArray = albumIdsArray.slice(0, 3);
                }
                
                console.log(`[PostController] Добавление ${albumIdsArray.length} альбомов к посту ${savedPost.id}`);
                try {
                    // Находим альбомы по ID
                    const albumIds = albumIdsArray.map(id => Number(id));
                    const albums = await AppDataSource.getRepository(Album).find({
                        where: { id: In(albumIds) }
                    });
                    
                    if (albums.length > 0) {
                        // Создаем записи в таблице PostAlbum напрямую через SQL
                        for (const album of albums) {
                            // Проверяем, нет ли уже такой связи
                            const existingRelation = await AppDataSource.query(
                                `SELECT * FROM post_album WHERE "postId" = $1 AND "albumId" = $2`,
                                [savedPost.id, album.id]
                            );
                            
                            if (existingRelation && existingRelation.length > 0) {
                                console.log(`[PostController] Связь между постом ${savedPost.id} и альбомом ${album.id} уже существует`);
                                continue;
                            }
                            
                            // Создаем запись в связующей таблице
                            await AppDataSource.query(
                                `INSERT INTO post_album ("postId", "albumId") VALUES ($1, $2)`,
                                [savedPost.id, album.id]
                            );
                            
                            console.log(`[PostController] Создана связь между постом ${savedPost.id} и альбомом ${album.id}`);
                        }
                        
                        console.log(`[PostController] Успешно добавлено ${albums.length} альбомов к посту ${savedPost.id}`);
                    } else {
                        console.log(`[PostController] Не найдено альбомов для добавления к посту ${savedPost.id}`);
                    }
                } catch (error) {
                    console.error(`[PostController] Ошибка при добавлении альбомов:`, error);
                }
            }
            
            // Возвращаем пост со всеми связями
            const fullPost = await this.getPostWithRelations(savedPost.id);
            console.log(`[PostController] Финальный пост с отношениями:`, {
                id: fullPost?.id,
                content: fullPost?.content,
                hasTracks: fullPost?.tracks && fullPost.tracks.length > 0,
                tracksCount: fullPost?.tracks?.length,
                photosCount: fullPost?.photos?.length,
                albumsCount: (fullPost as any)?.albums?.length
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
                
                // Ограничиваем количество треков до 10
                if (validTrackIds.length > 10) {
                    console.log(`[PostController] Превышено максимальное количество треков (10), обрезаем до первых 10`);
                    validTrackIds.splice(10);
                }
                
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