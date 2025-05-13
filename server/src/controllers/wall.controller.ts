import { Response } from 'express';
import { AppDataSource } from '../db/db_connect';
import { Post } from '../entities/post.entity';
import { User } from '../entities/user.entity';
import { AuthenticatedRequest } from '../types/express';
import { Photo } from '../entities/photo.entity';
import { Album } from '../entities/album.entity';
import { PostAlbum } from '../entities/post_album.entity';
import { MusicTrack } from '../entities/music.entity';
import { In } from 'typeorm';
import { PostMusicAlbum } from '../entities/post_music_album.entity';
import { MusicAlbum } from '../entities/music_album.entity';
import { Group } from '../entities/group.entity';
import { ImageMetadata } from '../utils/imageMetadata';
import * as path from 'path';
import * as fs from 'fs';

export class WallController {
    private postRepository = AppDataSource.getRepository(Post);
    private userRepository = AppDataSource.getRepository(User);
    private photoRepository = AppDataSource.getRepository(Photo);
    private albumRepository = AppDataSource.getRepository(Album);
    private musicTrackRepository = AppDataSource.getRepository(MusicTrack);
    private musicAlbumRepository = AppDataSource.getRepository(MusicAlbum);

    // Получение сохраненный пост со всеми связями
    private async getPostWithRelations(postId: number) {
        try {
            // Получаем пост со связями
            const post = await this.postRepository
                .createQueryBuilder('post')
                .leftJoinAndSelect('post.author', 'author')
                .leftJoinAndSelect('author.avatar', 'avatar')
                .leftJoinAndSelect('post.photos', 'photos')
                .leftJoinAndSelect('post.tracks', 'tracks')
                .where('post.id = :id', { id: postId })
                .getOne();

            if (post) {
                try {
                    // Загружаем альбомы для поста через TypeORM вместо SQL-запроса
                    const postAlbums = await AppDataSource.getRepository(PostAlbum)
                        .createQueryBuilder('postAlbum')
                        .leftJoinAndSelect('postAlbum.album', 'album')
                        .leftJoinAndSelect('album.photos', 'photo')
                        .where('postAlbum.postId = :postId', { postId })
                        .getMany();
                    
                    // Извлекаем альбомы из связующей таблицы
                    const albums = postAlbums.map(pa => pa.album);
                    console.log(`[WallController] Для поста ${postId} найдено ${albums.length} фотоальбомов`);
                    
                    // Теперь обработаем фотографии и добавим photosCount
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
                    
                    // Добавляем albums к посту
                    (post as any).albums = albums;

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
                    console.log(`[WallController] Для поста ${postId} найдено ${musicAlbums.length} музыкальных альбомов`);
                    
                    // Добавляем musicAlbums к посту
                    (post as any).musicAlbums = musicAlbums;
                    
                    // Добавляем аудио URL к каждому треку
                    if (post.tracks && post.tracks.length > 0) {
                        (post as any).tracks = post.tracks.map(track => ({
                            ...track,
                            audioUrl: `/api/music/file/${track.filename}`
                        }));
                    }
                } catch (error) {
                    console.error(`Ошибка при загрузке альбомов для поста ${postId}:`, error);
                    (post as any).albums = [];
                    (post as any).musicAlbums = [];
                }
                return post;
            }
            return null;
        } catch (error) {
            console.error(`Ошибка при получении поста ${postId}:`, error);
            return null;
        }
    }

    // Получение записей со стены пользователя
    async getWallPosts(req: AuthenticatedRequest, res: Response) {
        try {
            const { userId } = req.params;
            const { page = 1, limit = 10 } = req.query;
            
            // Явно преобразуем параметры в числа
            const numPage = Number(page);
            const numLimit = Number(limit);
            const skip = (numPage - 1) * numLimit;
            
            console.log(`[WallController] Запрос на получение записей со стены пользователя: ${userId}, страница ${numPage}, лимит ${numLimit}, пропуск ${skip}`);

            const queryBuilder = this.postRepository
                .createQueryBuilder('post')
                .leftJoinAndSelect('post.author', 'author')
                .leftJoinAndSelect('author.avatar', 'authorAvatar')
                .leftJoinAndSelect('post.photos', 'photos')
                .leftJoinAndSelect('post.tracks', 'tracks')
                .select([
                    'post.id',
                    'post.content',
                    'post.authorId',
                    'post.groupId',
                    'post.likesCount',
                    'post.commentsCount',
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
                    'photos.originalName',
                    'photos.mimetype',
                    'tracks.id',
                    'tracks.title',
                    'tracks.artist',
                    'tracks.duration',
                    'tracks.filename',
                    'tracks.coverUrl'
                ])
                .where('post.wallOwnerId = :userId', { userId: parseInt(userId) })
                .orderBy('post.createdAt', 'DESC')
                .take(numLimit)
                .skip(skip);

            const [postsQuery, total] = await queryBuilder.getManyAndCount();
            
            // Для каждого поста загружаем альбомы
            const posts = [];
            try {
                for (const post of postsQuery) {
                    const postWithAlbums = await this.getPostWithRelations(post.id);
                    if (postWithAlbums) {
                        // Добавляем wallOwnerId к посту для совместимости с клиентом
                        (postWithAlbums as any).wallOwnerId = parseInt(userId);
                        posts.push(postWithAlbums);
                    } else {
                        // Добавляем wallOwnerId к посту для совместимости с клиентом
                        const postWithWallOwner = {...post, albums: [], wallOwnerId: parseInt(userId)};
                        posts.push(postWithWallOwner);
                    }
                }
            } catch (error) {
                console.error('Ошибка при загрузке альбомов для постов:', error);
                // В случае ошибки добавляем посты без альбомов
                posts.push(...postsQuery.map(post => ({...post, albums: [], wallOwnerId: parseInt(userId)})));
            }

            res.json({
                posts,
                totalPosts: total,
                currentPage: Number(page),
                totalPages: Math.ceil(total / Number(limit))
            });
        } catch (error) {
            console.error('Ошибка при получении записей со стены:', error);
            res.status(500).json({ message: 'Ошибка при получении записей со стены' });
        }
    }

    // Создание записи на стене
    async createWallPost(req: AuthenticatedRequest, res: Response) {
        try {
            const { content, photoIds, albumIds, trackIds, authorId, wallOwnerId, musicAlbums } = req.body;
            const photos = req.files as Express.Multer.File[];
            
            // Обработка идентификаторов альбомов из JSON-строки
            let albums = [];
            if (albumIds) {
                try {
                    albums = JSON.parse(albumIds);
                    console.log('Обработаны ID альбомов:', albums);
                } catch (e) {
                    console.error('Ошибка при парсинге ID альбомов:', e);
                }
            }
            
            // Обработка идентификаторов треков из JSON-строки
            let parsedTrackIds = [];
            if (trackIds) {
                try {
                    parsedTrackIds = JSON.parse(trackIds);
                    console.log('Обработаны ID треков:', parsedTrackIds);
                } catch (e) {
                    console.error('Ошибка при парсинге ID треков:', e);
                }
            }
            
            // Обработка идентификаторов фотографий из JSON-строки
            let parsedPhotoIds = [];
            if (photoIds) {
                try {
                    parsedPhotoIds = JSON.parse(photoIds);
                    console.log('Обработаны ID фотографий:', parsedPhotoIds);
                } catch (e) {
                    console.error('Ошибка при парсинге ID фотографий:', e);
                }
            }
            
            // Объединяем все ID треков из разных источников
            const allTrackIds = parsedTrackIds || [];
            
            console.log('Создание поста на стене с данными:', { 
                content, 
                authorId, 
                wallOwnerId,
                albums: albums || [],
                photos: photos?.length || 0,
                trackIds: allTrackIds
            });

            // Валидация: максимум 20 фотографий
            if (photos && photos.length > 20) {
                return res.status(400).json({ 
                    message: "Максимальное количество фотографий - 20" 
                });
            }

            // Валидация: максимум 1 трек
            if (allTrackIds.length > 1) {
                return res.status(400).json({ 
                    message: "Можно прикрепить только один музыкальный трек" 
                });
            }

            // Создаем новый пост для стены
            const post = new Post();
            post.content = content;
            post.authorId = authorId;
            post.wallOwnerId = wallOwnerId;

            // Сохраняем пост
            const savedPost = await this.postRepository.save(post);

            // Если есть фотографии, связываем их с постом
            if (photos && photos.length > 0) {
                // Обрабатываем фотографии
                const photoEntities = [];
                for (const file of photos) {
                    const photo = new Photo();
                    photo.filename = file.filename;
                    photo.originalName = file.originalname;
                    photo.mimetype = file.mimetype;
                    
                    // Получаем размеры изображения и обновляем имя файла
                    try {
                        const filePath = path.join(process.cwd(), 'uploads/photos', file.filename);
                        const metadata = await ImageMetadata.extractWithSharp(filePath);
                        
                        if (metadata) {
                            photo.width = metadata.width;
                            photo.height = metadata.height;
                            
                            // Создаем новое имя файла с размерами
                            const newFilename = ImageMetadata.createFilenameWithDimensions(
                                file.filename,
                                metadata.width,
                                metadata.height
                            );
                            
                            // Переименовываем файл с указанием размеров
                            const newFilePath = path.join(process.cwd(), 'uploads/photos', newFilename);
                            fs.renameSync(filePath, newFilePath);
                            
                            photo.filename = newFilename;
                            photo.path = newFilename;
                        } else {
                            photo.path = file.filename;
                        }
                    } catch (error) {
                        console.error('Ошибка при извлечении метаданных изображения:', error);
                        photo.path = file.filename;
                    }
                    
                    photo.size = file.size;
                    
                    const savedPhoto = await this.photoRepository.save(photo);
                    photoEntities.push(savedPhoto);
                }

                // Связываем фотографии с постом
                post.photos = photoEntities;
                await this.postRepository.save(post);
            }

            console.log('Сохранен пост:', savedPost.id);
            
            // Обработка photoIds, если они указаны (для ранее загруженных фотографий)
            if (parsedPhotoIds && parsedPhotoIds.length > 0) {
                console.log('Добавление существующих фотографий к посту:', parsedPhotoIds);
                
                const existingPhotos = await this.photoRepository.findBy({
                    id: In(parsedPhotoIds)
                });
                
                if (!post.photos) {
                    post.photos = existingPhotos;
                } else {
                    post.photos = [...post.photos, ...existingPhotos];
                }
                
                console.log(`Добавлено ${existingPhotos.length} существующих фотографий к посту ${post.id}`);
                await this.postRepository.save(post);
            }
            
            // Обработка albumIds, если они указаны
            if (albums && albums.length > 0) {
                console.log('Добавление фотоальбомов к посту:', albums);
                
                for (const albumId of albums) {
                    const album = await this.albumRepository.findOneBy({ id: albumId });
                    
                    if (album) {
                        // Создаем связь между постом и альбомом
                        const postAlbum = new PostAlbum();
                        postAlbum.post = savedPost;
                        postAlbum.album = album;
                        
                        await AppDataSource.getRepository(PostAlbum).save(postAlbum);
                        console.log(`Создана связь между постом ${savedPost.id} и фотоальбомом ${album.id}`);
                    } else {
                        console.warn(`Фотоальбом с ID ${albumId} не найден!`);
                    }
                }
            }
            
            // Обработка trackIds, если они указаны
            if (allTrackIds && allTrackIds.length > 0) {
                console.log('Добавление треков к посту:', allTrackIds);
                
                // Получаем треки по их ID
                const tracks = await this.musicTrackRepository.findBy({
                    id: In(allTrackIds)
                });
                
                // Связываем треки с постом
                post.tracks = tracks;
                await this.postRepository.save(post);
                
                console.log(`Добавлено ${tracks.length} треков к посту ${post.id}`);
            }
            
            // Обработка musicAlbumIds, если они указаны
            if (musicAlbums && musicAlbums.length > 0) {
                console.log('Добавление музыкальных альбомов к посту:', musicAlbums);
                
                for (const musicAlbumId of musicAlbums) {
                    const musicAlbum = await this.musicAlbumRepository.findOneBy({ id: musicAlbumId });
                    
                    if (musicAlbum) {
                        // Создаем связь между постом и музыкальным альбомом
                        const postMusicAlbum = new PostMusicAlbum();
                        postMusicAlbum.post = savedPost;
                        postMusicAlbum.musicAlbum = musicAlbum;
                        
                        await AppDataSource.getRepository(PostMusicAlbum).save(postMusicAlbum);
                        console.log(`Создана связь между постом ${savedPost.id} и музыкальным альбомом ${musicAlbum.id}`);
                    } else {
                        console.warn(`Музыкальный альбом с ID ${musicAlbumId} не найден!`);
                    }
                }
            }
            
            // Получаем пост со всеми связями для ответа
            const savedPostWithRelations = await this.getPostWithRelations(savedPost.id);
            
            // Добавляем wallOwnerId для совместимости с клиентом
            const savedPostWithWallOwner = {
                ...savedPostWithRelations,
                wallOwnerId
            };
            
            // Проверяем наличие альбомов и их фотографий в подготовленном ответе
            if (savedPostWithWallOwner && (savedPostWithWallOwner as any).albums && (savedPostWithWallOwner as any).albums.length > 0) {
                const responseAlbums = (savedPostWithWallOwner as any).albums;
                console.log(`Пост ${savedPostWithWallOwner.id} содержит ${responseAlbums.length} альбомов в ответе`);
                
                for (const album of responseAlbums) {
                    console.log(`Альбом ${album.id} в ответе: photosCount=${album.photosCount}, photos.length=${album.photos?.length || 0}`);
                }
            }

            res.status(201).json(savedPostWithWallOwner);
        } catch (error: any) {
            console.error('Ошибка при создании поста на стене:', error);
            res.status(500).json({
                message: 'Ошибка при создании поста на стене',
                error: error.message
            });
        }
    }

    // Удаление записи со стены
    async deleteWallPost(req: AuthenticatedRequest, res: Response) {
        try {
            const { postId } = req.params;
            const userId = req.user.id;

            const post = await this.postRepository.findOne({
                where: { id: parseInt(postId) }
            });

            if (!post) {
                return res.status(404).json({ message: 'Запись не найдена' });
            }

            // Проверяем, является ли пользователь автором поста или владельцем стены
            if (post.authorId !== userId && post.wallOwnerId !== userId) {
                return res.status(403).json({ message: 'Нет прав для удаления этой записи' });
            }

            await this.postRepository.remove(post);
            return res.json({ message: 'Запись успешно удалена' });
        } catch (error) {
            console.error('Ошибка при удалении записи со стены:', error);
            return res.status(500).json({ message: 'Ошибка при удалении записи со стены' });
        }
    }

    // Обновление записи на стене
    async updateWallPost(req: AuthenticatedRequest, res: Response) {
        try {
            const { postId } = req.params;
            const { content, photoIds, trackIds, albumIds, musicAlbumIds } = req.body;
            
            console.log(`[WallController] Обновление wall поста ${postId}`);
            console.log('Новый контент:', content);
            console.log('Новые ID фотографий:', photoIds);
            console.log('Новые ID треков:', trackIds);
            console.log('Новые ID альбомов:', albumIds);
            console.log('Новые ID музыкальных альбомов:', musicAlbumIds);

            let post = await this.postRepository.findOne({
                where: { id: parseInt(postId) },
                relations: ['photos', 'tracks']
            });

            if (!post) {
                return res.status(404).json({ message: 'Post not found' });
            }

            // Обновляем текст
            post.content = content;

            // Обновляем фотографии
            if (photoIds && Array.isArray(photoIds)) {
                const photoRepository = AppDataSource.getRepository(Photo);
                const photos = await photoRepository.findBy({ id: In(photoIds.map(id => Number(id))) });
                post.photos = photos;
                console.log(`[WallController] Установлено ${photos.length} фотографий для поста ${postId}`);
            }

            // Обновляем треки
            if (trackIds && Array.isArray(trackIds)) {
                const tracks = await this.musicTrackRepository.findBy({ 
                    id: In(trackIds.map(id => Number(id))) 
                });
                post.tracks = tracks;
                console.log(`[WallController] Установлено ${tracks.length} треков для поста ${postId}`);
            }

            // Сохраняем изменения
            await this.postRepository.save(post);

            // Обновляем альбомы, если указаны
            if (albumIds && Array.isArray(albumIds)) {
                // Удаляем текущие связи с альбомами
                await AppDataSource.query(`
                    DELETE FROM post_album
                    WHERE "postId" = $1
                `, [postId]);

                // Создаем новые связи с альбомами
                for (const albumId of albumIds) {
                    await AppDataSource.query(`
                        INSERT INTO post_album ("postId", "albumId", "wallPostId")
                        VALUES ($1, $2, NULL)
                    `, [postId, albumId]);
                }
                
                console.log(`[WallController] Обновлены альбомы для поста ${postId}`);
            }
            
            // Обновляем музыкальные альбомы, если указаны
            if (musicAlbumIds && Array.isArray(musicAlbumIds)) {
                // Удаляем текущие связи с музыкальными альбомами
                await AppDataSource.query(`
                    DELETE FROM post_music_albums
                    WHERE "postId" = $1
                `, [postId]);

                // Создаем новые связи с музыкальными альбомами
                for (const musicAlbumId of musicAlbumIds) {
                    const musicAlbum = await this.musicAlbumRepository.findOneBy({ id: Number(musicAlbumId) });
                    
                    if (musicAlbum) {
                        // Создаем связь между постом и музыкальным альбомом
                        const postMusicAlbum = new PostMusicAlbum();
                        postMusicAlbum.post = post;
                        postMusicAlbum.musicAlbum = musicAlbum;
                        
                        await AppDataSource.getRepository(PostMusicAlbum).save(postMusicAlbum);
                        console.log(`[WallController] Создана связь между постом ${postId} и музыкальным альбомом ${musicAlbum.id}`);
                    } else {
                        console.warn(`[WallController] Музыкальный альбом с ID ${musicAlbumId} не найден!`);
                    }
                }
                
                console.log(`[WallController] Обновлены музыкальные альбомы для поста ${postId}`);
            }

            // Получаем обновленный пост со всеми связями
            const updatedPost = await this.getPostWithRelations(parseInt(postId));
            
            if (!updatedPost) {
                return res.status(404).json({ message: 'Не удалось загрузить обновленный пост' });
            }
            
            // Добавляем wallOwnerId для совместимости с клиентом
            const updatedPostWithWallOwner = {
                ...updatedPost,
                wallOwnerId: post.wallOwnerId
            };

            return res.json(updatedPostWithWallOwner);
        } catch (error) {
            console.error('Ошибка при обновлении поста:', error);
            return res.status(500).json({ message: 'Ошибка при обновлении поста' });
        }
    }
} 