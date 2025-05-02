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
                authorType,
                authorId,
                wallOwnerId
            } = req.body;

            console.log('[PostController] Получены данные для создания поста:', {
                content,
                attachments,
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
            if (!content && (!attachments || attachments.length === 0)) {
                res.status(400).json({ message: "Пост должен содержать текст или вложения" });
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

                // Сохраняем пост с вложениями
                await this.postRepository.save(post);
            }

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
            
            // Для каждого поста загружаем альбомы
            const posts = [];
            for (const post of postsQuery) {
                // Загружаем альбомы для поста
                const postAlbums = await AppDataSource.getRepository(PostAlbum)
                    .createQueryBuilder('postAlbum')
                    .leftJoinAndSelect('postAlbum.album', 'album')
                    .leftJoinAndSelect('album.photos', 'photo')
                    .where('postAlbum.postId = :postId', { postId: post.id })
                    .getMany();
                
                // Извлекаем альбомы из связующей таблицы
                const albums = postAlbums.map(pa => pa.album);
                
                // Добавляем альбомы к посту
                posts.push({
                    ...post,
                    albums: albums
                });
            }
            
            console.log(`[PostController] Найдено ${posts.length} постов (limit=${limit}, offset=${offset})`);
            res.json(posts);
        } catch (err) {
            console.error('Ошибка при получении постов из групп и собственных постов пользователя:', err);
            res.status(500).json({ error: 'Ошибка при получении постов' });
        }
    };
} 