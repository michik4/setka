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
import { Group } from '../entities/group.entity';
import { MusicAlbum } from "../entities/music_album.entity";
import { PostMusicAlbum } from "../entities/post_music_album.entity";

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
                .leftJoinAndSelect('post.group', 'group')
                .leftJoinAndSelect('group.avatar', 'groupAvatar')
                .select([
                    'post.id',
                    'post.content',
                    'post.authorId',
                    'post.groupId',
                    'post.wallOwnerId',
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
                    'group.id',
                    'group.name',
                    'group.slug',
                    'groupAvatar.id',
                    'groupAvatar.path',
                ])
                .where('post.id = :id', { id: postId })
                .getOne();
                
            if (post) {
                // Загружаем фотографии с учетом порядка
                try {
                    // Проверяем, есть ли информация о порядке в базе данных
                    const orderedPhotos = await AppDataSource.query(
                        `SELECT p.* FROM photos p
                         JOIN posts_photos pp ON p.id = pp."photoId"
                         WHERE pp."postId" = $1
                         ORDER BY pp."order" ASC`,
                        [postId]
                    );
                    
                    // Если удалось получить упорядоченные фотографии, заменяем ими текущие
                    if (orderedPhotos && orderedPhotos.length > 0) {
                        console.log(`[PostController] Загружено ${orderedPhotos.length} фотографий с сохранением порядка для поста ${postId}`);
                        post.photos = orderedPhotos;
                    } else if (!post.photos || post.photos.length === 0) {
                        // Если фотографии не загрузились через связующую таблицу, но они есть у поста
                        const photosFromPost = await AppDataSource.query(
                            `SELECT p.* FROM photos p
                             JOIN posts_photos pp ON p.id = pp."photoId"
                             WHERE pp."postId" = $1`,
                            [postId]
                        );
                            
                        if (photosFromPost && photosFromPost.length > 0) {
                            console.log(`[PostController] Загружено ${photosFromPost.length} фотографий прямым SQL-запросом для поста ${postId}`);
                            post.photos = photosFromPost;
                        }
                    }
                } catch (error) {
                    console.error(`[PostController] Ошибка при загрузке упорядоченных фотографий для поста ${postId}:`, error);
                }
                
                // Загружаем фотоальбомы для поста через TypeORM
                const postAlbums = await AppDataSource.getRepository(PostAlbum)
                    .createQueryBuilder('postAlbum')
                    .leftJoinAndSelect('postAlbum.album', 'album')
                    .leftJoinAndSelect('album.photos', 'photo')
                    .where('postAlbum.postId = :postId', { postId })
                    .getMany();
                
                // Извлекаем альбомы из связующей таблицы
                const albums = postAlbums.map(pa => pa.album);
                console.log(`[PostController] Для поста ${postId} найдено ${albums.length} фотоальбомов через TypeORM`);
                
                // Обработаем фотографии и добавим photosCount для каждого альбома
                for (const album of albums) {
                    try {
                        if (album.photos && album.photos.length > 0) {
                            album.photosCount = album.photos.length;
                            console.log(`Альбом ${album.id}: количество фото ${album.photosCount}`);
                        } else {
                            // Если фотографии не загрузились через JOINы, загрузим отдельно
                            console.log(`Получаем фотографии для альбома ${album.id} отдельным запросом`);
                            const photos = await AppDataSource.getRepository(Photo)
                                .createQueryBuilder('photo')
                                .innerJoin('album_photos', 'ap', 'photo.id = ap.photoId')
                                .where('ap.albumId = :albumId', { albumId: album.id })
                                .getMany();
                            
                            album.photos = photos;
                            album.photosCount = photos.length;
                            console.log(`Альбом ${album.id}: количество фото ${album.photosCount}`);
                        }
                    } catch (error) {
                        console.error(`Ошибка при загрузке данных для альбома ${album.id}:`, error);
                        album.photos = [];
                        album.photosCount = 0;
                    }
                }
                
                // Загружаем музыкальные альбомы для поста
                const postMusicAlbums = await AppDataSource.getRepository(PostMusicAlbum)
                    .createQueryBuilder('postMusicAlbum')
                    .leftJoinAndSelect('postMusicAlbum.musicAlbum', 'musicAlbum')
                    .leftJoinAndSelect('musicAlbum.tracks', 'tracks')
                    .where('postMusicAlbum.postId = :postId', { postId })
                    .getMany();
                
                // Извлекаем музыкальные альбомы из связующей таблицы
                const musicAlbums = postMusicAlbums.map(pma => {
                    const musicAlbum = pma.musicAlbum;
                    // Добавляем количество треков
                    musicAlbum.tracksCount = musicAlbum.tracks?.length || 0;
                    return musicAlbum;
                });
                console.log(`[PostController] Для поста ${postId} найдено ${musicAlbums.length} музыкальных альбомов`);
                
                // Добавляем все обработанные данные к посту
                post.albums = albums;
                post.musicAlbums = musicAlbums;
                
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
            
            // Получаем параметры пагинации из запроса
            const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
            const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
            
            console.log(`[PostController] Пагинация: limit=${limit}, offset=${offset}`);
            
            const postsQuery = await this.postRepository
                .createQueryBuilder('post')
                .leftJoinAndSelect('post.author', 'author')
                .leftJoinAndSelect('author.avatar', 'authorAvatar')
                .leftJoinAndSelect('post.photos', 'photos')
                .leftJoinAndSelect('post.tracks', 'tracks')
                .leftJoinAndSelect('post.group', 'group')
                .leftJoinAndSelect('group.avatar', 'groupAvatar')
                .select([
                    'post.id',
                    'post.content',
                    'post.authorId',
                    'post.groupId',
                    'post.wallOwnerId',
                    'post.likesCount',
                    'post.commentsCount',
                    'post.sharesCount',
                    'post.viewsCount',
                    'post.createdAt',
                    'post.updatedAt',
                    'group.id',
                    'group.name',
                    'group.slug',
                    'groupAvatar.id',
                    'groupAvatar.path',
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
                .take(limit)
                .skip(offset)
                .getMany();
                
            // Для каждого поста загружаем альбомы и обрабатываем треки
            const posts = [];
            try {
                for (const post of postsQuery) {
                    // Загружаем фотографии с учетом порядка для каждого поста
                    try {
                        const orderedPhotos = await AppDataSource.query(
                            `SELECT p.* FROM photos p
                            JOIN posts_photos pp ON p.id = pp."photoId"
                            WHERE pp."postId" = $1
                            ORDER BY pp."order" ASC`,
                            [post.id]
                        );
                        
                        if (orderedPhotos && orderedPhotos.length > 0) {
                            console.log(`[PostController] Загружено ${orderedPhotos.length} фотографий с сохранением порядка для поста ${post.id} в ленте`);
                            post.photos = orderedPhotos;
                        }
                    } catch (photosError) {
                        console.error(`[PostController] Ошибка при загрузке упорядоченных фотографий для поста ${post.id} в ленте:`, photosError);
                    }
                    
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

            console.log(`[PostController] Найдено ${posts.length} постов (limit=${limit}, offset=${offset})`);
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
                attachments,
                photoIds,
                albumIds,
                trackIds,
                musicAlbumIds,
                authorType,
                authorId,
                wallOwnerId
            } = req.body;

            console.log('[PostController] Получены данные для создания поста:', {
                content,
                attachments,
                photoIds,
                albumIds,
                trackIds,
                musicAlbumIds,
                authorType,
                authorId,
                wallOwnerId
            });

            // Проверяем права доступа
            const userId = (req as AuthenticatedRequest).user?.id;
            if (!userId) {
                res.status(401).json({ message: "Не авторизован" });
                return;
            }

            // Если пост создается от имени группы, проверяем права администратора
            if (authorType === 'group') {
                const group = await AppDataSource.getRepository(Group).findOne({
                    where: { id: authorId },
                    relations: ['admins']
                });

                if (!group) {
                    res.status(404).json({ message: "Группа не найдена" });
                    return;
                }

                const isAdmin = group.admins.some(admin => admin.id === userId);
                if (!isAdmin) {
                    res.status(403).json({ message: "Нет прав для публикации от имени группы" });
                    return;
                }
            } else if (authorId !== userId) {
                // Если пост создается от имени пользователя, проверяем, что это тот же пользователь
                res.status(403).json({ message: "Нет прав для публикации от имени другого пользователя" });
                return;
            }

            // Проверяем наличие содержимого или вложений
            const hasAttachments = 
                (attachments && attachments.length > 0) || 
                (photoIds && photoIds.length > 0) || 
                (trackIds && trackIds.length > 0) || 
                (musicAlbumIds && musicAlbumIds.length > 0);
            
            let hasValidAlbums = false;
            
            // Проверяем, что альбомы не пустые и не содержат только удаленные фотографии
            if (albumIds && albumIds.length > 0) {
                for (const albumId of albumIds) {
                    const album = await AppDataSource.manager.findOne('Album', {
                        where: { id: Number(albumId) },
                        relations: ['photos']
                    }) as Album;
                    
                    // Если альбом существует и содержит неудаленные фотографии, считаем его валидным вложением
                    if (album && album.photos && album.photos.length > 0) {
                        // Проверяем, что в альбоме есть хотя бы одна неудаленная фотография
                        const activePhotos = album.photos.filter(photo => !photo.isDeleted);
                        if (activePhotos.length > 0) {
                            hasValidAlbums = true;
                            break;
                        }
                    }
                }
            }
                
            if (!content && !hasAttachments && !hasValidAlbums) {
                res.status(400).json({ message: "Пост должен содержать текст или вложения. Пустые альбомы не считаются валидным вложением." });
                return;
            }

            // Создаем новый пост
            const post = new Post();
            post.content = content || '';

            // Если пост создается от имени группы, устанавливаем groupId и authorId пользователя, который создает пост
            if (authorType === 'group') {
                post.groupId = authorId; // authorId здесь - это ID группы
                post.authorId = userId; // authorId здесь - это ID пользователя, который создает пост
                 // Убедимся, что post.author не заполняется пользователем при создании от имени группы
                // post.author = null;
            } else {
                // Если пост создается от имени пользователя
                post.authorId = authorId; // authorId здесь - это ID пользователя из запроса
                // Загружаем автора только если это пост пользователя (для связей, не для сохранения authorId)
                post.author = await AppDataSource.manager.findOne('User', {
                    where: { id: authorId }
                }) as any;
            }

            // Устанавливаем wallOwnerId, если он передан
            if (wallOwnerId) {
                post.wallOwnerId = Number(wallOwnerId);
            }

            // Устанавливаем счетчики
            post.likesCount = 0;
            post.commentsCount = 0;
            post.sharesCount = 0;
            post.viewsCount = 0;

            // Сохраняем пост
            const savedPost = await this.postRepository.save(post);

            // Обрабатываем вложения
            if (attachments && attachments.length > 0) {
                for (const attachment of attachments) {
                    switch (attachment.type) {
                        case 'photo':
                            if (!post.photos) post.photos = [];
                            const photo = await AppDataSource.manager.findOne('Photo', {
                                where: { id: attachment.id }
                            }) as Photo;
                            if (photo) post.photos.push(photo);
                            break;
                        case 'album':
                            const album = await AppDataSource.manager.findOne('Album', {
                                where: { id: attachment.id }
                            }) as Album;
                            if (album) {
                                const postAlbum = new PostAlbum();
                                postAlbum.post = savedPost;
                                postAlbum.album = album;
                                await AppDataSource.getRepository(PostAlbum).save(postAlbum);
                            }
                            break;
                        case 'track':
                            if (!post.tracks) post.tracks = [];
                            const track = await AppDataSource.manager.findOne('MusicTrack', {
                                where: { id: attachment.id }
                            }) as MusicTrack;
                            if (track) post.tracks.push(track);
                            break;
                    }
                }
            }
            
            // Обрабатываем photoIds (новый формат)
            if (photoIds && photoIds.length > 0) {
                if (!post.photos) post.photos = [];
                
                // Создаем массив с фотографиями в том же порядке, в котором переданы ID
                const photos = [];
                for (const photoId of photoIds) {
                    const photo = await AppDataSource.manager.findOne('Photo', {
                        where: { id: Number(photoId) }
                    }) as Photo;
                    if (photo) {
                        photos.push(photo);
                    }
                }
                
                post.photos = photos;
                console.log(`[PostController] Добавлено ${photos.length} фотографий к посту ${post.id} с сохранением порядка`);
                
                // Обновляем порядок в связующей таблице
                if (photos.length > 0 && savedPost) {
                    try {
                        // Сначала удаляем существующие связи (если есть)
                        await AppDataSource.query(
                            `DELETE FROM posts_photos WHERE "postId" = $1`,
                            [savedPost.id]
                        );
                        
                        // Затем создаем новые связи в нужном порядке
                        for (let i = 0; i < photos.length; i++) {
                            await AppDataSource.query(
                                `INSERT INTO posts_photos ("postId", "photoId", "order") VALUES ($1, $2, $3)`,
                                [savedPost.id, photos[i].id, i]
                            );
                        }
                        
                        console.log(`[PostController] Установлен порядок ${photos.length} фотографий в связующей таблице для нового поста ${savedPost.id}`);
                    } catch (orderError) {
                        console.error('[PostController] Ошибка при установке порядка фотографий для нового поста:', orderError);
                    }
                }
            }
            
            // Обрабатываем albumIds (новый формат)
            if (albumIds && albumIds.length > 0) {
                for (const albumId of albumIds) {
                    const album = await AppDataSource.manager.findOne('Album', {
                        where: { id: Number(albumId) }
                    }) as Album;
                    if (album) {
                        const postAlbum = new PostAlbum();
                        postAlbum.post = savedPost;
                        postAlbum.album = album;
                        await AppDataSource.getRepository(PostAlbum).save(postAlbum);
                        console.log(`[PostController] Создана связь между постом ${savedPost.id} и альбомом ${album.id}`);
                    }
                }
            }
            
            // Обрабатываем trackIds (новый формат)
            if (trackIds && trackIds.length > 0) {
                if (!post.tracks) post.tracks = [];
                const tracks = await this.musicTrackRepository.findBy(
                    trackIds.map((id: number) => ({ id: Number(id) }))
                );
                post.tracks = tracks;
                console.log(`[PostController] Добавлено ${tracks.length} треков к посту ${post.id}`);
            }
            
            // Обрабатываем musicAlbumIds (новый формат)
            if (musicAlbumIds && musicAlbumIds.length > 0) {
                for (const albumId of musicAlbumIds) {
                    const album = await AppDataSource.manager.findOne('MusicAlbum', {
                        where: { id: Number(albumId) }
                    }) as MusicAlbum;
                    if (album) {
                        const postMusicAlbum = new PostMusicAlbum();
                        postMusicAlbum.post = savedPost;
                        postMusicAlbum.musicAlbum = album;
                        await AppDataSource.getRepository(PostMusicAlbum).save(postMusicAlbum);
                        console.log(`[PostController] Создана связь между постом ${savedPost.id} и музыкальным альбомом ${album.id}`);
                    }
                }
            }

            // Сохраняем пост с вложениями
            await this.postRepository.save(post);

            // Получаем полный пост со всеми связями
            const fullPost = await this.getPostWithRelations(savedPost.id);
            
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
            const { content, photoIds, trackIds, photoAlbumIds, musicAlbumIds } = req.body;
            
            console.log(`[PostController] Обновление поста ${id}`);
            console.log('Новый контент:', content);
            console.log('Новые ID фотографий:', photoIds);
            console.log('Новые ID треков:', trackIds);
            console.log('Новые ID фотоальбомов:', photoAlbumIds);
            console.log('Новые ID музыкальных альбомов:', musicAlbumIds);
            
            // Находим пост
            const post = await this.postRepository.findOne({
                where: { id },
                relations: ['photos', 'tracks']
            });
            
            if (!post) {
                res.status(404).json({ message: 'Пост не найден' });
                return;
            }
            
            // Проверяем наличие контента или вложений после обновления
            const hasAttachments = 
                (photoIds && photoIds.length > 0) || 
                (trackIds && trackIds.length > 0) || 
                (musicAlbumIds && musicAlbumIds.length > 0);
                
            let hasValidAlbums = false;
            
            // Проверяем, что альбомы не пустые и не содержат только удаленные фотографии
            if (photoAlbumIds && photoAlbumIds.length > 0) {
                for (const albumId of photoAlbumIds) {
                    const album = await AppDataSource.manager.findOne('Album', {
                        where: { id: Number(albumId) },
                        relations: ['photos']
                    }) as Album;
                    
                    // Если альбом существует и содержит неудаленные фотографии, считаем его валидным вложением
                    if (album && album.photos && album.photos.length > 0) {
                        // Проверяем, что в альбоме есть хотя бы одна неудаленная фотография
                        const activePhotos = album.photos.filter(photo => !photo.isDeleted);
                        if (activePhotos.length > 0) {
                            hasValidAlbums = true;
                            break;
                        }
                    }
                }
            }
            
            if (!content && !hasAttachments && !hasValidAlbums) {
                res.status(400).json({ message: "Пост должен содержать текст или вложения. Пустые альбомы не считаются валидным вложением." });
                return;
            }
            
            post.content = content;
            
            // Обрабатываем изменение фотографий
            if (Array.isArray(photoIds)) {
                // Создаем массив с фотографиями в том же порядке, в котором переданы ID
                const photos = [];
                for (const photoId of photoIds) {
                    const photo = await AppDataSource.manager.findOne('Photo', {
                        where: { id: Number(photoId) }
                    }) as Photo;
                    if (photo) {
                        photos.push(photo);
                    }
                }
                post.photos = photos;
                console.log(`[PostController] Установлено ${photos.length} фотографий для поста ${id} в заданном порядке`);
                
                // Также обновляем порядок в связующей таблице, если она используется
                if (photos.length > 0) {
                    try {
                        // Сначала удаляем все связи с фотографиями
                        await AppDataSource.query(
                            `DELETE FROM posts_photos WHERE "postId" = $1`,
                            [id]
                        );
                        
                        // Затем создаем новые связи в нужном порядке
                        for (let i = 0; i < photos.length; i++) {
                            await AppDataSource.query(
                                `INSERT INTO posts_photos ("postId", "photoId", "order") VALUES ($1, $2, $3)`,
                                [id, photos[i].id, i]
                            );
                        }
                        
                        console.log(`[PostController] Обновлён порядок ${photos.length} фотографий в связующей таблице для поста ${id}`);
                    } catch (orderError) {
                        console.error('[PostController] Ошибка при обновлении порядка фотографий:', orderError);
                    }
                }
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
            
            // Обрабатываем фотоальбомы
            if (Array.isArray(photoAlbumIds)) {
                // Сначала удаляем все существующие связи с фотоальбомами
                await AppDataSource.getRepository(PostAlbum)
                    .createQueryBuilder()
                    .delete()
                    .where("postId = :postId", { postId: id })
                    .execute();
                
                // Затем создаем новые связи
                for (const albumId of photoAlbumIds) {
                    const album = await AppDataSource.manager.findOne('Album', {
                        where: { id: Number(albumId) }
                    }) as Album;
                    
                    if (album) {
                        const postAlbum = new PostAlbum();
                        postAlbum.post = post;
                        postAlbum.album = album;
                        await AppDataSource.getRepository(PostAlbum).save(postAlbum);
                        console.log(`[PostController] Создана связь между постом ${id} и фотоальбомом ${album.id}`);
                    }
                }
            }
            
            // Обрабатываем музыкальные альбомы
            if (Array.isArray(musicAlbumIds)) {
                // Сначала удаляем все существующие связи с музыкальными альбомами
                await AppDataSource.getRepository(PostMusicAlbum)
                    .createQueryBuilder()
                    .delete()
                    .where("postId = :postId", { postId: id })
                    .execute();
                
                // Затем создаем новые связи
                for (const albumId of musicAlbumIds) {
                    const album = await AppDataSource.manager.findOne('MusicAlbum', {
                        where: { id: Number(albumId) }
                    }) as MusicAlbum;
                    
                    if (album) {
                        const postMusicAlbum = new PostMusicAlbum();
                        postMusicAlbum.post = post;
                        postMusicAlbum.musicAlbum = album;
                        await AppDataSource.getRepository(PostMusicAlbum).save(postMusicAlbum);
                        console.log(`[PostController] Создана связь между постом ${id} и музыкальным альбомом ${album.id}`);
                    }
                }
            }
            
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
                    // Загружаем фотографии с учетом порядка для каждого поста пользователя
                    try {
                        const orderedPhotos = await AppDataSource.query(
                            `SELECT p.* FROM photos p
                            JOIN posts_photos pp ON p.id = pp."photoId"
                            WHERE pp."postId" = $1
                            ORDER BY pp."order" ASC`,
                            [post.id]
                        );
                        
                        if (orderedPhotos && orderedPhotos.length > 0) {
                            console.log(`[PostController] Загружено ${orderedPhotos.length} фотографий с сохранением порядка для поста ${post.id} пользователя ${userId}`);
                            post.photos = orderedPhotos;
                        }
                    } catch (photosError) {
                        console.error(`[PostController] Ошибка при загрузке упорядоченных фотографий для поста ${post.id} пользователя ${userId}:`, photosError);
                    }
                    
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
            const post = await this.postRepository.findOne({
                where: { id: postId }
            });

            if (!post) {
                console.log(`[PostController] Пост с ID ${postId} не найден`);
                res.status(404).json({ message: 'Пост не найден' });
                return;
            }

            console.log(`[PostController] Пост найден, проверяем существующий лайк`);

            // Проверяем, есть ли уже лайк
            const existingLike = await this.likeRepository.findOne({
                where: { userId, postId }
            });

            let response;
            if (existingLike) {
                console.log(`[PostController] Лайк найден, удаляем`);
                // Если лайк есть - удаляем его
                await this.likeRepository.remove(existingLike);
                post.likesCount = Math.max(0, post.likesCount - 1);
                await this.postRepository.save(post);
                response = { liked: false, likesCount: post.likesCount };
            } else {
                console.log(`[PostController] Лайк не найден, создаем новый`);
                // Если лайка нет - создаем
                const newLike = this.likeRepository.create({
                    userId: userId,
                    postId: postId
                });
                await this.likeRepository.save(newLike);
                post.likesCount++;
                await this.postRepository.save(post);
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

            // Находим лайк пользователя к этому посту
            const like = await this.likeRepository.findOne({
                where: { userId, postId }
            });

            // Находим пост для получения актуального количества лайков
            const post = await this.postRepository.findOne({
                where: { id: postId }
            });

            const likesCount = post ? post.likesCount : 0;

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

    // Получение постов содержащих фотографию по ID
    public getPostsWithPhoto = async (req: Request, res: Response): Promise<void> => {
        try {
            const photoId = Number(req.params.photoId);
            console.log(`[PostController] Запрос на получение постов с фотографией по ID: ${photoId}`);
            
            // Получаем обычные посты с этой фотографией
            const postsQuery = await this.postRepository
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

            // Для каждого поста загружаем отношения, включая музыкальные альбомы
            const processedPosts = [];
            for (const post of postsQuery) {
                const postWithRelations = await this.getPostWithRelations(post.id);
                if (postWithRelations) {
                    processedPosts.push(postWithRelations);
                } else {
                    // Если не удалось загрузить с отношениями, добавляем трекам audioUrl
                    if (post.tracks && post.tracks.length > 0) {
                        post.tracks = post.tracks.map(track => ({
                            ...track,
                            audioUrl: `/api/music/file/${track.filename}`
                        }));
                    }
                    processedPosts.push({...post, albums: [], musicAlbums: []});
                }
            }

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

    // Получение постов из групп, на которые подписан пользователь
    public getSubscribedGroupsPosts = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as AuthenticatedRequest).user?.id;
            
            if (!userId) {
                res.status(401).json({ error: 'Пользователь не авторизован' });
                return;
            }
            
            // Получаем параметры пагинации из запроса
            const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
            const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
            
            console.log(`[PostController] Запрос на получение постов из групп, на которые подписан пользователь: ${userId} (limit=${limit}, offset=${offset})`);
            
            // Получаем список групп, на которые подписан пользователь
            const userGroups = await AppDataSource
                .getRepository(Group)
                .createQueryBuilder('group')
                .innerJoin('group.members', 'member', 'member.id = :userId', { userId })
                .select('group.id')
                .getMany();
                
            const groupIds = userGroups.map(group => group.id);
            
            // Запрос теперь включает как посты из групп, так и собственные посты пользователя
            // Обратите внимание на изменение условия WHERE
            const postsQuery = await this.postRepository
                .createQueryBuilder('post')
                .leftJoinAndSelect('post.author', 'author')
                .leftJoinAndSelect('author.avatar', 'authorAvatar')
                .leftJoinAndSelect('post.photos', 'photos')
                .leftJoinAndSelect('post.tracks', 'tracks')
                .leftJoinAndSelect('post.group', 'group')
                .leftJoinAndSelect('group.avatar', 'groupAvatar')
                .select([
                    'post.id',
                    'post.content',
                    'post.authorId',
                    'post.groupId',
                    'post.wallOwnerId',
                    'post.likesCount',
                    'post.commentsCount',
                    'post.sharesCount',
                    'post.viewsCount',
                    'post.createdAt',
                    'post.updatedAt',
                    'group.id',
                    'group.name',
                    'group.slug',
                    'groupAvatar.id',
                    'groupAvatar.path',
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
                .where(
                    // Теперь запрос включает ИЛИ: 1) посты из групп, на которые подписан пользователь,
                    // ИЛИ 2) посты самого пользователя, где он автор
                    groupIds.length > 0 
                        ? '(post.groupId IN (:...groupIds) OR post.authorId = :userId)'
                        : 'post.authorId = :userId',
                    { groupIds, userId }
                )
                .orderBy('post.createdAt', 'DESC')
                .take(limit)
                .skip(offset)
                .getMany();
            
            // Для каждого поста загружаем альбомы и музыкальные альбомы
            const posts = [];
            for (const post of postsQuery) {
                // Загружаем фотографии с учетом порядка для каждого поста из групп
                try {
                    const orderedPhotos = await AppDataSource.query(
                        `SELECT p.* FROM photos p
                        JOIN posts_photos pp ON p.id = pp."photoId"
                        WHERE pp."postId" = $1
                        ORDER BY pp."order" ASC`,
                        [post.id]
                    );
                    
                    if (orderedPhotos && orderedPhotos.length > 0) {
                        console.log(`[PostController] Загружено ${orderedPhotos.length} фотографий с сохранением порядка для поста ${post.id} из подписанных групп пользователя ${userId}`);
                        post.photos = orderedPhotos;
                    }
                } catch (photosError) {
                    console.error(`[PostController] Ошибка при загрузке упорядоченных фотографий для поста ${post.id} из подписанных групп:`, photosError);
                }
                
                const postWithRelations = await this.getPostWithRelations(post.id);
                if (postWithRelations) {
                    posts.push(postWithRelations);
                } else {
                    // Если не удалось загрузить с отношениями, добавляем базовый пост c альбомами и треками
                    // Загружаем альбомы для поста
                    const postAlbums = await AppDataSource.getRepository(PostAlbum)
                        .createQueryBuilder('postAlbum')
                        .leftJoinAndSelect('postAlbum.album', 'album')
                        .leftJoinAndSelect('album.photos', 'photo')
                        .where('postAlbum.postId = :postId', { postId: post.id })
                        .getMany();
                    
                    // Извлекаем альбомы из связующей таблицы
                    const albums = postAlbums.map(pa => pa.album);
                    
                    // Загружаем музыкальные альбомы для поста
                    const postMusicAlbums = await AppDataSource.getRepository(PostMusicAlbum)
                        .createQueryBuilder('postMusicAlbum')
                        .leftJoinAndSelect('postMusicAlbum.musicAlbum', 'musicAlbum')
                        .leftJoinAndSelect('musicAlbum.tracks', 'tracks')
                        .where('postMusicAlbum.postId = :postId', { postId: post.id })
                        .getMany();
                    
                    // Извлекаем музыкальные альбомы из связующей таблицы
                    const musicAlbums = postMusicAlbums.map(pma => {
                        const musicAlbum = pma.musicAlbum;
                        // Добавляем количество треков
                        musicAlbum.tracksCount = musicAlbum.tracks?.length || 0;
                        return musicAlbum;
                    });
                    
                    // Добавляем audioUrl к каждому треку
                    if (post.tracks && post.tracks.length > 0) {
                        post.tracks = post.tracks.map(track => ({
                            ...track,
                            audioUrl: `/api/music/file/${track.filename}`
                        }));
                    }
                    
                    // Добавляем альбомы к посту
                    posts.push({
                        ...post,
                        albums: albums,
                        musicAlbums: musicAlbums
                    });
                }
            }
            
            console.log(`[PostController] Найдено ${posts.length} постов (limit=${limit}, offset=${offset})`);
            res.json(posts);
        } catch (err) {
            console.error('Ошибка при получении постов из групп и собственных постов пользователя:', err);
            res.status(500).json({ error: 'Ошибка при получении постов' });
        }
    };
} 