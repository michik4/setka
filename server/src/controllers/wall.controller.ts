import { Response } from 'express';
import { AppDataSource } from '../db/db_connect';
import { WallPost } from '../entities/wall.entity';
import { User } from '../entities/user.entity';
import { AuthenticatedRequest } from '../types/express';
import { Photo } from '../entities/photo.entity';
import { Album } from '../entities/album.entity';
import { PostAlbum } from '../entities/post_album.entity';
import { MusicTrack } from '../entities/music.entity';
import { In } from 'typeorm';

export class WallController {
    private wallPostRepository = AppDataSource.getRepository(WallPost);
    private userRepository = AppDataSource.getRepository(User);
    private photoRepository = AppDataSource.getRepository(Photo);
    private albumRepository = AppDataSource.getRepository(Album);
    private musicTrackRepository = AppDataSource.getRepository(MusicTrack);

    // Получение сохраненный пост со всеми связями
    private async getPostWithRelations(postId: number) {
        try {
            // Получаем пост со связями
            const post = await this.wallPostRepository
                .createQueryBuilder('post')
                .leftJoinAndSelect('post.author', 'author')
                .leftJoinAndSelect('author.avatar', 'avatar')
                .leftJoinAndSelect('post.photos', 'photos')
                .leftJoinAndSelect('post.tracks', 'tracks')
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

                    // Преобразуем пути к аудиофайлам для каждого трека
                    if (post.tracks && post.tracks.length > 0) {
                        console.log(`[WallController] Найдено ${post.tracks.length} треков для wall поста ${postId}:`, 
                          post.tracks.map(t => ({ id: t.id, title: t.title, filename: t.filename })));
                        
                        post.tracks = post.tracks.map(track => {
                            // Проверим, что у нас есть имя файла
                            if (!track.filename) {
                                console.error(`[WallController] Трек с ID ${track.id} не имеет имени файла! Детали трека:`, track);
                                // Добавляем пустой audioUrl для предотвращения ошибок на клиенте
                                return {
                                    ...track,
                                    audioUrl: ''
                                };
                            }
                            
                            // Создаем URL для аудио
                            const audioUrl = `/api/music/file/${track.filename}`;
                            console.log(`[WallController] Добавлен URL для трека ${track.id}: ${audioUrl}`);
                            
                            return {
                                ...track,
                                audioUrl
                            };
                        });
                        
                        // Проверяем, что у всех треков есть audioUrl
                        for (const track of post.tracks) {
                            const trackWithAudio = track as any;
                            if (!trackWithAudio.audioUrl) {
                                console.error(`[WallController] ОШИБКА: Трек ${track.id} не имеет audioUrl после обработки!`);
                                trackWithAudio.audioUrl = `/api/music/file/${track.filename || 'unknown'}`; 
                            }
                        }
                    } else {
                        console.log(`[WallController] Не найдено треков для wall поста ${postId}`);
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
                .leftJoinAndSelect('wallPost.tracks', 'tracks')
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
                    'photos.mimetype',
                    'tracks.id',
                    'tracks.title',
                    'tracks.artist',
                    'tracks.duration',
                    'tracks.filename',
                    'tracks.coverUrl'
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
            
            const { content, authorId, wallOwnerId, trackIds, trackId } = req.body;
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
            
            // Собираем все ID треков в один массив
            let allTrackIds: any[] = [];
            
            // Обрабатываем trackIds
            if (trackIds) {
                let parsedTrackIds = trackIds;
                if (typeof trackIds === 'string') {
                    try {
                        parsedTrackIds = JSON.parse(trackIds);
                        console.log('[WallController] Удалось распарсить trackIds из строки:', parsedTrackIds);
                    } catch (e) {
                        console.error('[WallController] Ошибка при парсинге trackIds:', e);
                        // Если это одиночное значение, пробуем превратить его в массив
                        if (!isNaN(Number(trackIds))) {
                            parsedTrackIds = [Number(trackIds)];
                            console.log('[WallController] Преобразовано в массив из одного элемента:', parsedTrackIds);
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
            
            console.log('[WallController] Итоговый список ID треков:', allTrackIds);
            const photos = req.files as Express.Multer.File[];
            
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

            // Обрабатываем добавление музыкальных треков через ORM
            if (Array.isArray(allTrackIds) && allTrackIds.length > 0) {
                console.log(`[WallController] Начинаем добавление ${allTrackIds.length} треков к wall посту ${savedWallPost.id}`, allTrackIds);
                
                try {
                    // Проверяем доступные треки в базе данных
                    console.log('[WallController] Проверка доступных треков в базе данных...');
                    const allTracks = await this.musicTrackRepository.find();
                    console.log(`[WallController] В базе данных найдено ${allTracks.length} треков:`);
                    if (allTracks.length > 0) {
                        console.log(allTracks.map(t => ({ id: t.id, title: t.title, artist: t.artist })));
                    } else {
                        console.log('[WallController] В базе данных нет треков!');
                    }
                    
                    // Преобразуем все ID в числа для безопасного поиска
                    const trackIdsNumbers = allTrackIds
                        .map(id => Number(id))
                        .filter(id => !isNaN(id));
                    
                    console.log(`[WallController] Преобразованные ID треков: ${JSON.stringify(trackIdsNumbers)}`);
                    
                    // Находим треки по ID
                    const trackEntities = await this.musicTrackRepository.findBy(
                        trackIdsNumbers.map(id => ({ id }))
                    );
                    
                    console.log(`[WallController] Найдено ${trackEntities.length} треков из ${trackIdsNumbers.length} запрошенных`);
                    console.log('[WallController] Найденные треки:', trackEntities.map(t => ({ id: t.id, title: t.title, artist: t.artist })));
                    
                    if (trackEntities.length > 0) {
                        // Проверим состояние поста до добавления треков
                        console.log(`[WallController] Состояние поста ДО добавления треков:`, {
                            id: savedWallPost.id,
                            hasTracks: !!savedWallPost.tracks,
                            tracksCount: savedWallPost.tracks?.length || 0
                        });
                        
                        // Присваиваем треки к посту через ORM
                        savedWallPost.tracks = trackEntities;
                        
                        console.log(`[WallController] Присвоены треки к посту:`, {
                            postId: savedWallPost.id, 
                            tracksAssigned: savedWallPost.tracks.length,
                            tracksDetails: savedWallPost.tracks.map(t => ({ id: t.id, title: t.title }))
                        });
                        
                        // Сохраняем обновленный пост с треками
                        const updatedPost = await this.wallPostRepository.save(savedWallPost);
                        
                        console.log(`[WallController] Результат сохранения поста:`, {
                            id: updatedPost.id,
                            hasTracks: !!updatedPost.tracks,
                            tracksCount: updatedPost.tracks?.length || 0
                        });
                        
                        console.log(`[WallController] Добавлено ${trackEntities.length} треков к посту ${savedWallPost.id} через ORM`);
                        
                        // Проверим SQL запросы напрямую
                        try {
                            const trackRelations = await AppDataSource.query(
                                `SELECT * FROM wall_posts_tracks WHERE "wallPostId" = $1`,
                                [savedWallPost.id]
                            );
                            console.log(`[WallController] Связи в таблице wall_posts_tracks:`, trackRelations);
                        } catch (sqlError) {
                            console.error(`[WallController] Ошибка при проверке связей:`, sqlError);
                            // Если таблица не существует, создаем её
                            try {
                                console.log('[WallController] Попытка создать таблицу wall_posts_tracks...');
                                await AppDataSource.query(`
                                    CREATE TABLE IF NOT EXISTS wall_posts_tracks (
                                        "wallPostId" integer NOT NULL,
                                        "trackId" integer NOT NULL,
                                        CONSTRAINT "PK_wall_posts_tracks" PRIMARY KEY ("wallPostId", "trackId"),
                                        CONSTRAINT "FK_wall_posts" FOREIGN KEY ("wallPostId") 
                                            REFERENCES "wall_posts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
                                        CONSTRAINT "FK_tracks" FOREIGN KEY ("trackId") 
                                            REFERENCES "music_tracks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
                                    );
                                `);
                                console.log('[WallController] Таблица wall_posts_tracks успешно создана');
                                
                                // Вставляем данные напрямую
                                await AppDataSource.query(
                                    `INSERT INTO wall_posts_tracks ("wallPostId", "trackId") VALUES ($1, $2)
                                     ON CONFLICT ("wallPostId", "trackId") DO NOTHING`,
                                    [savedWallPost.id, trackEntities[0].id]
                                );
                                console.log(`[WallController] Добавлена связь между wall постом ${savedWallPost.id} и треком ${trackEntities[0].id}`);
                            } catch (createTableError) {
                                console.error('[WallController] Ошибка при создании таблицы wall_posts_tracks:', createTableError);
                            }
                        }
                    } else {
                        console.log(`[WallController] Не найдено треков для добавления к посту`);
                    }
                } catch (error) {
                    console.error(`[WallController] Ошибка при добавлении треков:`, error);
                }
            } else {
                console.log(`[WallController] Нет треков для добавления к посту`);
            }

            // Если есть альбомы, связываем их с постом
            if (albums && albums.length > 0) {
                console.log(`Найдено ${albums.length} альбомов для привязки к посту ${savedWallPost.id}:`, albums);
                
                try {
                    // Находим альбомы по ID и проверяем, что они не приватные
                    const albumsToAdd = await this.albumRepository.find({
                        where: { 
                            id: In(albums.map((id: any) => Number(id))),
                            isPrivate: false 
                        }
                    });
                    
                    if (albumsToAdd.length > 0) {
                        console.log(`Найдено ${albumsToAdd.length} альбомов из ${albums.length} для привязки к посту ${savedWallPost.id}`);
                        
                        // Присваиваем альбомы посту
                        savedWallPost.albums = albumsToAdd;
                        
                        // Сохраняем пост с альбомами
                        await this.wallPostRepository.save(savedWallPost);
                        
                        console.log(`Привязано ${albumsToAdd.length} альбомов к посту ${savedWallPost.id}`);
                    } else {
                        console.log(`Не найдено подходящих альбомов для привязки к посту ${savedWallPost.id}`);
                    }
                } catch (error) {
                    console.error(`Ошибка при связывании поста ${savedWallPost.id} с альбомами:`, error);
                }
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
            const { content, photoIds, trackIds, albumIds } = req.body;
            
            console.log(`[WallController] Обновление wall поста ${postId}`);
            console.log('Новый контент:', content);
            console.log('Новые ID фотографий:', photoIds);
            console.log('Новые ID треков:', trackIds);
            console.log('Новые ID альбомов:', albumIds);

            let wallPost = await this.wallPostRepository.findOne({
                where: { id: parseInt(postId) },
                relations: ['photos', 'tracks', 'albums']
            });

            if (!wallPost) {
                return res.status(404).json({ message: 'Wall post not found' });
            }

            // Обновляем текст
            wallPost.content = content;

            // Обновляем фотографии
            if (photoIds && Array.isArray(photoIds)) {
                const photoRepository = AppDataSource.getRepository(Photo);
                const photos = await photoRepository.findBy({ id: In(photoIds.map(id => Number(id))) });
                wallPost.photos = photos;
                console.log(`[WallController] Установлено ${photos.length} фотографий для поста ${postId}`);
            }
            
            // Обрабатываем изменение треков
            if (Array.isArray(trackIds)) {
                // Преобразуем ID в числа и отфильтруем невалидные значения
                const validTrackIds = trackIds
                    .map(id => Number(id))
                    .filter(id => !isNaN(id));
                
                console.log(`[WallController] Поиск ${validTrackIds.length} треков для обновления поста ${postId}`);
                
                // Находим треки по ID
                const tracks = await this.musicTrackRepository.findBy(
                    validTrackIds.map(id => ({ id }))
                );
                
                console.log(`[WallController] Найдено ${tracks.length} треков из ${validTrackIds.length}`);
                
                // Присваиваем треки посту
                wallPost.tracks = tracks;
                console.log(`[WallController] Установлено ${tracks.length} треков для поста ${postId}`);
            }

            // Обрабатываем изменение альбомов
            if (Array.isArray(albumIds)) {
                // Преобразуем ID в числа и отфильтруем невалидные значения
                const validAlbumIds = albumIds
                    .map(id => Number(id))
                    .filter(id => !isNaN(id));
                
                console.log(`[WallController] Поиск ${validAlbumIds.length} альбомов для обновления поста ${postId}`);
                
                // Находим альбомы по ID и проверяем, что они не приватные
                const albums = await this.albumRepository.find({
                    where: { id: In(validAlbumIds), isPrivate: false }
                });
                
                console.log(`[WallController] Найдено ${albums.length} альбомов из ${validAlbumIds.length}`);
                
                // Присваиваем альбомы посту
                wallPost.albums = albums;
                console.log(`[WallController] Установлено ${albums.length} альбомов для поста ${postId}`);
            }

            await this.wallPostRepository.save(wallPost);
            console.log(`[WallController] Пост ${postId} успешно обновлен`);

            // Загружаем обновленный пост с отношениями
            const updatedPost = await this.getPostWithRelations(wallPost.id);
            res.json(updatedPost);
        } catch (error) {
            console.error('Error updating wall post:', error);
            res.status(500).json({ message: 'Error updating wall post' });
        }
    }
} 