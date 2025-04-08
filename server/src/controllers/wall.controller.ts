import { Response } from 'express';
import { AppDataSource } from '../db/db_connect';
import { WallPost } from '../entities/wall.entity';
import { User } from '../entities/user.entity';
import { AuthenticatedRequest } from '../types/express';
import { Photo } from '../entities/photo.entity';
import { Album } from '../entities/album.entity';
import { PostAlbum } from '../entities/post_album.entity';

export class WallController {
    private wallPostRepository = AppDataSource.getRepository(WallPost);
    private userRepository = AppDataSource.getRepository(User);
    private photoRepository = AppDataSource.getRepository(Photo);
    private albumRepository = AppDataSource.getRepository(Album);

    // Получение сохраненный пост со всеми связями
    private async getPostWithRelations(postId: number) {
        try {
            // Получаем пост со связями
            const post = await this.wallPostRepository
                .createQueryBuilder('post')
                .leftJoinAndSelect('post.author', 'author')
                .leftJoinAndSelect('author.avatar', 'avatar')
                .leftJoinAndSelect('post.photos', 'photos')
                .where('post.id = :id', { id: postId })
                .getOne();

            if (post) {
                try {
                    // Загружаем альбомы напрямую через SQL-запрос
                    const albumsQuery = await AppDataSource.query(`
                        SELECT a.* FROM albums a
                        JOIN post_album pa ON a.id = pa."albumId"
                        WHERE pa."postId" = $1
                    `, [postId]);
                    
                    if (albumsQuery && albumsQuery.length > 0) {
                        console.log(`Загружено ${albumsQuery.length} альбомов для wall поста ${postId}`);
                        
                        // Если альбом один, добавляем флаг для полной ширины
                        if (albumsQuery.length === 1) {
                            albumsQuery[0].isFullWidth = true;
                        }
                        
                        // Получаем актуальное количество фотографий для каждого альбома
                        for (const album of albumsQuery) {
                            try {
                                // Сначала получаем только количество фотографий для альбома
                                const photoCountResult = await AppDataSource.query(`
                                    SELECT COUNT(*) as count FROM album_photos
                                    WHERE "albumId" = $1
                                `, [album.id]);
                                
                                // Устанавливаем актуальное количество фотографий
                                const actualPhotoCount = parseInt(photoCountResult[0].count, 10);
                                album.photosCount = actualPhotoCount;
                                
                                console.log(`Альбом ${album.id}: актуальное количество фотографий = ${actualPhotoCount}`);
                                
                                // Если фотографий больше 0, загружаем их
                                if (actualPhotoCount > 0) {
                                    // Улучшенный запрос для загрузки фотографий из альбома
                                    const photosQuery = await AppDataSource.query(`
                                        SELECT p.id, p.filename, p.path, p."originalName", p.mimetype, p.size
                                        FROM photo p
                                        JOIN album_photos ap ON p.id = ap."photoId"
                                        WHERE ap."albumId" = $1
                                        ORDER BY p.id DESC
                                        LIMIT 5
                                    `, [album.id]);
                                    
                                    // Обработка результатов запроса
                                    if (photosQuery && photosQuery.length > 0) {
                                        console.log(`[DEBUG] Фотографии альбома ${album.id}:`, 
                                            photosQuery.map((p: any) => ({ id: p.id, path: p.path })));
                                        
                                        // Обрабатываем фотографии и конвертируем id в числовой тип
                                        const processedPhotos = photosQuery.map((photo: any) => {
                                            photo.id = Number(photo.id);
                                            return photo;
                                        });
                                        
                                        // Записываем фотографии в альбом
                                        album.photos = processedPhotos;
                                        
                                        // Обязательно устанавливаем последнюю фотографию как обложку
                                        // Первый элемент в массиве - самая новая фотография (т.к. ORDER BY p.id DESC)
                                        if (processedPhotos.length > 0) {
                                            album.coverPhoto = processedPhotos[0];
                                            console.log(`Обложка альбома ${album.id}: ID=${album.coverPhoto.id}, путь=${album.coverPhoto.path}`);
                                        }
                                        
                                        console.log(`Альбом ${album.id}: загружено ${processedPhotos.length} фото для превью`);
                                    } else {
                                        console.log(`Предупреждение: альбом ${album.id} имеет ${actualPhotoCount} фото, но запрос не вернул данные`);
                                        album.photos = [];
                                        
                                        // Пытаемся получить хотя бы обложку альбома отдельным запросом
                                        try {
                                            const coverQuery = await AppDataSource.query(`
                                                SELECT p.id, p.filename, p.path, p."originalName", p.mimetype, p.size
                                                FROM photo p
                                                JOIN album_photos ap ON p.id = ap."photoId"
                                                WHERE ap."albumId" = $1
                                                ORDER BY p.id DESC
                                                LIMIT 1
                                            `, [album.id]);
                                            
                                            if (coverQuery && coverQuery.length > 0) {
                                                const coverPhoto = coverQuery[0];
                                                coverPhoto.id = Number(coverPhoto.id);
                                                album.coverPhoto = coverPhoto;
                                                console.log(`Получена обложка для альбома ${album.id}: ID=${coverPhoto.id}, путь=${coverPhoto.path}`);
                                            }
                                        } catch (coverError) {
                                            console.error(`Ошибка при получении обложки для альбома ${album.id}:`, coverError);
                                        }
                                    }
                                } else {
                                    console.log(`Альбом ${album.id} не содержит фотографий`);
                                    album.photos = [];
                                }
                            } catch (error) {
                                console.error(`Ошибка при загрузке данных для альбома ${album.id}:`, error);
                                album.photos = [];
                                album.photosCount = 0;
                            }
                        }
                        
                        // Добавляем albums к посту
                        (post as any).albums = albumsQuery;
                    } else {
                        console.log(`Не найдено альбомов для wall поста ${postId}`);
                        (post as any).albums = [];
                    }
                } catch (error) {
                    console.error('Ошибка при загрузке альбомов для wall поста:', error);
                    (post as any).albums = [];
                }
            }
            
            return post;
        } catch (error) {
            console.error(`Ошибка при получении wall поста ${postId}:`, error);
            return null;
        }
    }

    // Получение записей со стены пользователя
    async getWallPosts(req: AuthenticatedRequest, res: Response) {
        try {
            const { userId } = req.params;
            const { page = 1, limit = 10 } = req.query;

            const queryBuilder = this.wallPostRepository
                .createQueryBuilder('wallPost')
                .leftJoinAndSelect('wallPost.author', 'author')
                .leftJoinAndSelect('author.avatar', 'authorAvatar')
                .leftJoinAndSelect('wallPost.photos', 'photos')
                .select([
                    'wallPost.id',
                    'wallPost.content',
                    'wallPost.authorId',
                    'wallPost.wallOwnerId',
                    'wallPost.createdAt',
                    'wallPost.updatedAt',
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
                    'photos.mimetype'
                ])
                .where('wallPost.wallOwnerId = :userId', { userId: parseInt(userId) })
                .orderBy('wallPost.createdAt', 'DESC')
                .take(Number(limit))
                .skip((Number(page) - 1) * Number(limit));

            const [postsQuery, total] = await queryBuilder.getManyAndCount();
            
            // Для каждого поста загружаем альбомы
            const posts = [];
            try {
                for (const post of postsQuery) {
                    const postWithAlbums = await this.getPostWithRelations(post.id);
                    if (postWithAlbums) {
                        posts.push(postWithAlbums);
                    } else {
                        posts.push({...post, albums: []});
                    }
                }
            } catch (error) {
                console.error('Ошибка при загрузке альбомов для постов:', error);
                // В случае ошибки добавляем посты без альбомов
                posts.push(...postsQuery.map(post => ({...post, albums: []})));
            }

            return res.json({
                posts,
                total,
                currentPage: Number(page),
                totalPages: Math.ceil(total / Number(limit))
            });
        } catch (error) {
            console.error('Ошибка при получении записей со стены:', error);
            return res.status(500).json({ message: 'Ошибка при получении записей со стены' });
        }
    }

    // Создание нового поста на стене
    async createWallPost(req: AuthenticatedRequest, res: Response) {
        try {
            console.log('Body запроса:', req.body);
            console.log('Файлы:', req.files);
            
            const { content, authorId, wallOwnerId } = req.body;
            let albums = req.body.albums;
            
            // Обновленная обработка albums - проверяем как массив из FormData
            if (req.body['albums[]']) {
                // Если пришел как albums[], преобразуем в массив
                albums = Array.isArray(req.body['albums[]']) 
                    ? req.body['albums[]'].map(id => parseInt(id, 10))
                    : [parseInt(req.body['albums[]'], 10)];
                console.log('Преобразовали albums[] в массив:', albums);
            } 
            // Обрабатываем стандартный случай с JSON строкой
            else if (albums && typeof albums === 'string') {
                try {
                    albums = JSON.parse(albums);
                    console.log('Успешно распарсили JSON с альбомами:', albums);
                } catch (error) {
                    console.error('Ошибка при парсинге JSON albums:', error);
                    albums = [];
                }
            }
            
            const photos = req.files as Express.Multer.File[];
            
            console.log('Создание поста на стене с данными:', { 
                content, 
                authorId, 
                wallOwnerId,
                albums: albums || [],
                photos: photos?.length || 0
            });

            // Валидация: максимум 4 фотографии
            if (photos && photos.length > 4) {
                return res.status(400).json({ 
                    message: "Максимальное количество фотографий - 4" 
                });
            }

            // Создаем новый пост на стене
            const wallPost = new WallPost();
            wallPost.content = content;
            wallPost.authorId = authorId;
            wallPost.wallOwnerId = wallOwnerId;

            // Сохраняем пост
            const savedWallPost = await this.wallPostRepository.save(wallPost);

            // Если есть фотографии, связываем их с постом
            if (photos && photos.length > 0) {
                // Обрабатываем фотографии
                const photoEntities = [];
                for (const file of photos) {
                    const photo = new Photo();
                    photo.filename = file.filename;
                    photo.originalName = file.originalname;
                    photo.mimetype = file.mimetype;
                    photo.path = `/uploads/${file.filename}`;
                    photo.size = file.size;
                    
                    const savedPhoto = await this.photoRepository.save(photo);
                    photoEntities.push(savedPhoto);
                }

                // Связываем фотографии с постом
                wallPost.photos = photoEntities;
                await this.wallPostRepository.save(wallPost);
            }

            console.log('Сохранен пост:', savedWallPost.id);

            // Если есть альбомы, связываем их с постом
            if (albums && albums.length > 0) {
                console.log(`Найдено ${albums.length} альбомов для привязки к посту ${savedWallPost.id}:`, albums);
                
                // Находим альбомы по ID и проверяем, что они не приватные
                for (const albumId of albums) {
                    try {
                        const album = await this.albumRepository.findOne({
                            where: { id: albumId },
                            relations: ['photos'] // Загружаем связанные фотографии
                        });
                        
                        if (!album) {
                            console.log(`Альбом с ID ${albumId} не найден`);
                            continue;
                        }
                        
                        // Проверяем, не является ли альбом приватным
                        if (album.isPrivate) {
                            console.log(`Альбом ${album.id} является приватным, пропускаем`);
                            continue;
                        }
                        
                        console.log(`Альбом ${album.id} имеет ${album.photos?.length || 0} фотографий`);
                        
                        // Создаем запись в таблице связей напрямую через SQL
                        try {
                            await AppDataSource.query(`
                                INSERT INTO post_album ("postId", "albumId")
                                VALUES ($1, $2)
                                ON CONFLICT ("postId", "albumId") DO NOTHING
                            `, [savedWallPost.id, album.id]);
                            
                            console.log(`Привязан альбом ${album.id} к посту ${savedWallPost.id}`);
                        } catch (error) {
                            console.error(`Ошибка при вставке связи поста и альбома:`, error);
                        }
                    } catch (error) {
                        console.error(`Ошибка при связывании поста ${savedWallPost.id} с альбомом ${albumId}:`, error);
                    }
                }
                
                console.log(`Альбомы связаны с постом ${savedWallPost.id}`);
            }

            // Загружаем пост с отношениями для ответа
            const savedPost = await this.getPostWithRelations(wallPost.id);
            
            // Проверяем наличие альбомов и их фотографий в подготовленном ответе
            if (savedPost && (savedPost as any).albums && (savedPost as any).albums.length > 0) {
                const responseAlbums = (savedPost as any).albums;
                console.log(`Пост ${savedPost.id} содержит ${responseAlbums.length} альбомов в ответе`);
                
                for (const album of responseAlbums) {
                    console.log(`Альбом ${album.id} в ответе: photosCount=${album.photosCount}, photos.length=${album.photos?.length || 0}`);
                }
            }

            res.status(201).json(savedPost);
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

            const post = await this.wallPostRepository.findOne({
                where: { id: parseInt(postId) }
            });

            if (!post) {
                return res.status(404).json({ message: 'Запись не найдена' });
            }

            // Проверяем, является ли пользователь автором поста или владельцем стены
            if (post.authorId !== userId && post.wallOwnerId !== userId) {
                return res.status(403).json({ message: 'Нет прав для удаления этой записи' });
            }

            await this.wallPostRepository.remove(post);
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
            const { content, photoIds } = req.body;

            let wallPost = await this.wallPostRepository.findOne({
                where: { id: parseInt(postId) },
                relations: ['photos']
            });

            if (!wallPost) {
                return res.status(404).json({ message: 'Wall post not found' });
            }

            // Обновляем текст
            wallPost.content = content;

            // Обновляем фотографии
            if (photoIds && Array.isArray(photoIds)) {
                const photoRepository = AppDataSource.getRepository(Photo);
                const photos = await photoRepository.findByIds(photoIds);
                wallPost.photos = photos;
            }

            await this.wallPostRepository.save(wallPost);

            // Загружаем обновленный пост с отношениями
            wallPost = await this.wallPostRepository
                .createQueryBuilder('wallPost')
                .leftJoinAndSelect('wallPost.author', 'author')
                .leftJoinAndSelect('author.avatar', 'authorAvatar')
                .leftJoinAndSelect('wallPost.photos', 'photos')
                .select([
                    'wallPost.id',
                    'wallPost.content',
                    'wallPost.authorId',
                    'wallPost.wallOwnerId',
                    'wallPost.createdAt',
                    'wallPost.updatedAt',
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
                    'photos.mimetype'
                ])
                .where('wallPost.id = :id', { id: wallPost.id })
                .getOne();

            res.json(wallPost);
        } catch (error) {
            console.error('Error updating wall post:', error);
            res.status(500).json({ message: 'Error updating wall post' });
        }
    }
} 