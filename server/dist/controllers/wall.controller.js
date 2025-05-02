"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WallController = void 0;
const db_connect_1 = require("../db/db_connect");
const post_entity_1 = require("../entities/post.entity");
const user_entity_1 = require("../entities/user.entity");
const photo_entity_1 = require("../entities/photo.entity");
const album_entity_1 = require("../entities/album.entity");
const post_album_entity_1 = require("../entities/post_album.entity");
const music_entity_1 = require("../entities/music.entity");
const typeorm_1 = require("typeorm");
class WallController {
    constructor() {
        this.postRepository = db_connect_1.AppDataSource.getRepository(post_entity_1.Post);
        this.userRepository = db_connect_1.AppDataSource.getRepository(user_entity_1.User);
        this.photoRepository = db_connect_1.AppDataSource.getRepository(photo_entity_1.Photo);
        this.albumRepository = db_connect_1.AppDataSource.getRepository(album_entity_1.Album);
        this.musicTrackRepository = db_connect_1.AppDataSource.getRepository(music_entity_1.MusicTrack);
    }
    // Получение сохраненный пост со всеми связями
    async getPostWithRelations(postId) {
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
                    // Загружаем альбомы напрямую через SQL-запрос
                    const albumsQuery = await db_connect_1.AppDataSource.query(`
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
                                const photoCountResult = await db_connect_1.AppDataSource.query(`
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
                                    const photosQuery = await db_connect_1.AppDataSource.query(`
                                        SELECT p.id, p.filename, p.path, p."originalName", p.mimetype, p.size
                                        FROM photo p
                                        JOIN album_photos ap ON p.id = ap."photoId"
                                        WHERE ap."albumId" = $1
                                        ORDER BY p.id DESC
                                        LIMIT 5
                                    `, [album.id]);
                                    // Обработка результатов запроса
                                    if (photosQuery && photosQuery.length > 0) {
                                        console.log(`[DEBUG] Фотографии альбома ${album.id}:`, photosQuery.map((p) => ({ id: p.id, path: p.path })));
                                        // Обрабатываем фотографии и конвертируем id в числовой тип
                                        const processedPhotos = photosQuery.map((photo) => {
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
                                    }
                                    else {
                                        console.log(`Предупреждение: альбом ${album.id} имеет ${actualPhotoCount} фото, но запрос не вернул данные`);
                                        album.photos = [];
                                        // Пытаемся получить хотя бы обложку альбома отдельным запросом
                                        try {
                                            const coverQuery = await db_connect_1.AppDataSource.query(`
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
                                        }
                                        catch (coverError) {
                                            console.error(`Ошибка при получении обложки для альбома ${album.id}:`, coverError);
                                        }
                                    }
                                }
                                else {
                                    console.log(`Альбом ${album.id} не содержит фотографий`);
                                    album.photos = [];
                                }
                            }
                            catch (error) {
                                console.error(`Ошибка при загрузке данных для альбома ${album.id}:`, error);
                                album.photos = [];
                                album.photosCount = 0;
                            }
                        }
                        // Добавляем albums к посту
                        post.albums = albumsQuery;
                    }
                    else {
                        console.log(`Не найдено альбомов для wall поста ${postId}`);
                        post.albums = [];
                    }
                    // Преобразуем пути к аудиофайлам для каждого трека
                    if (post.tracks && post.tracks.length > 0) {
                        console.log(`[WallController] Найдено ${post.tracks.length} треков для wall поста ${postId}:`, post.tracks.map(t => ({ id: t.id, title: t.title, filename: t.filename })));
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
                            const trackWithAudio = track;
                            if (!trackWithAudio.audioUrl) {
                                console.error(`[WallController] ОШИБКА: Трек ${track.id} не имеет audioUrl после обработки!`);
                                trackWithAudio.audioUrl = `/api/music/file/${track.filename || 'unknown'}`;
                            }
                        }
                    }
                    else {
                        console.log(`[WallController] Не найдено треков для wall поста ${postId}`);
                    }
                }
                catch (error) {
                    console.error('Ошибка при загрузке альбомов для wall поста:', error);
                    post.albums = [];
                }
            }
            return post;
        }
        catch (error) {
            console.error(`Ошибка при получении wall поста ${postId}:`, error);
            return null;
        }
    }
    // Получение записей со стены пользователя
    async getWallPosts(req, res) {
        try {
            const { userId } = req.params;
            const { page = 1, limit = 10 } = req.query;
            console.log(`[WallController] Запрос на получение записей со стены пользователя: ${userId}, страница ${page}, лимит ${limit}`);
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
                .take(Number(limit))
                .skip((Number(page) - 1) * Number(limit));
            const [postsQuery, total] = await queryBuilder.getManyAndCount();
            console.log(`[WallController] Найдено ${postsQuery.length} записей для стены пользователя ${userId} из ${total} всего`);
            // Для каждого поста загружаем альбомы
            const posts = [];
            try {
                for (const post of postsQuery) {
                    const postWithAlbums = await this.getPostWithRelations(post.id);
                    if (postWithAlbums) {
                        // Добавляем wallOwnerId к посту для совместимости с клиентом
                        postWithAlbums.wallOwnerId = parseInt(userId);
                        posts.push(postWithAlbums);
                    }
                    else {
                        // Добавляем wallOwnerId к посту для совместимости с клиентом
                        const postWithWallOwner = { ...post, albums: [], wallOwnerId: parseInt(userId) };
                        posts.push(postWithWallOwner);
                    }
                }
            }
            catch (error) {
                console.error('Ошибка при загрузке альбомов для постов:', error);
                // В случае ошибки добавляем посты без альбомов
                posts.push(...postsQuery.map(post => ({ ...post, albums: [], wallOwnerId: parseInt(userId) })));
            }
            const response = {
                posts,
                totalPosts: total,
                currentPage: Number(page),
                totalPages: Math.ceil(total / Number(limit))
            };
            console.log(`[WallController] Отправка ${posts.length} постов клиенту, всего страниц: ${response.totalPages}`);
            res.json(response);
        }
        catch (error) {
            console.error('Ошибка при получении записей со стены:', error);
            res.status(500).json({ message: 'Ошибка при получении записей со стены' });
        }
    }
    // Создание записи на стене
    async createWallPost(req, res) {
        var _a;
        try {
            const { content, photoIds, albumIds, trackIds, authorId, wallOwnerId } = req.body;
            const photos = req.files;
            // Обработка идентификаторов альбомов из JSON-строки
            let albums = [];
            if (albumIds) {
                try {
                    albums = JSON.parse(albumIds);
                    console.log('Обработаны ID альбомов:', albums);
                }
                catch (e) {
                    console.error('Ошибка при парсинге ID альбомов:', e);
                }
            }
            // Обработка идентификаторов треков из JSON-строки
            let parsedTrackIds = [];
            if (trackIds) {
                try {
                    parsedTrackIds = JSON.parse(trackIds);
                    console.log('Обработаны ID треков:', parsedTrackIds);
                }
                catch (e) {
                    console.error('Ошибка при парсинге ID треков:', e);
                }
            }
            // Обработка идентификаторов фотографий из JSON-строки
            let parsedPhotoIds = [];
            if (photoIds) {
                try {
                    parsedPhotoIds = JSON.parse(photoIds);
                    console.log('Обработаны ID фотографий:', parsedPhotoIds);
                }
                catch (e) {
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
                photos: (photos === null || photos === void 0 ? void 0 : photos.length) || 0,
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
            const post = new post_entity_1.Post();
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
                    const photo = new photo_entity_1.Photo();
                    photo.filename = file.filename;
                    photo.originalName = file.originalname;
                    photo.mimetype = file.mimetype;
                    photo.path = `/uploads/${file.filename}`;
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
                    id: (0, typeorm_1.In)(parsedPhotoIds)
                });
                if (!post.photos) {
                    post.photos = existingPhotos;
                }
                else {
                    post.photos = [...post.photos, ...existingPhotos];
                }
                console.log(`Добавлено ${existingPhotos.length} существующих фотографий к посту ${post.id}`);
                await this.postRepository.save(post);
            }
            // Обработка albumIds, если они указаны
            if (albums && albums.length > 0) {
                console.log('Добавление альбомов к посту:', albums);
                for (const albumId of albums) {
                    const album = await this.albumRepository.findOneBy({ id: albumId });
                    if (album) {
                        // Создаем связь между постом и альбомом
                        const postAlbum = new post_album_entity_1.PostAlbum();
                        postAlbum.post = savedPost;
                        postAlbum.album = album;
                        await db_connect_1.AppDataSource.getRepository(post_album_entity_1.PostAlbum).save(postAlbum);
                        console.log(`Создана связь между постом ${savedPost.id} и альбомом ${album.id}`);
                    }
                    else {
                        console.warn(`Альбом с ID ${albumId} не найден!`);
                    }
                }
            }
            // Обработка trackIds, если они указаны
            if (allTrackIds && allTrackIds.length > 0) {
                console.log('Добавление треков к посту:', allTrackIds);
                // Получаем треки по их ID
                const tracks = await this.musicTrackRepository.findBy({
                    id: (0, typeorm_1.In)(allTrackIds)
                });
                // Связываем треки с постом
                post.tracks = tracks;
                await this.postRepository.save(post);
                console.log(`Добавлено ${tracks.length} треков к посту ${post.id}`);
            }
            // Получаем пост со всеми связями для ответа
            const savedPostWithRelations = await this.getPostWithRelations(savedPost.id);
            // Добавляем wallOwnerId для совместимости с клиентом
            const savedPostWithWallOwner = {
                ...savedPostWithRelations,
                wallOwnerId
            };
            // Проверяем наличие альбомов и их фотографий в подготовленном ответе
            if (savedPostWithWallOwner && savedPostWithWallOwner.albums && savedPostWithWallOwner.albums.length > 0) {
                const responseAlbums = savedPostWithWallOwner.albums;
                console.log(`Пост ${savedPostWithWallOwner.id} содержит ${responseAlbums.length} альбомов в ответе`);
                for (const album of responseAlbums) {
                    console.log(`Альбом ${album.id} в ответе: photosCount=${album.photosCount}, photos.length=${((_a = album.photos) === null || _a === void 0 ? void 0 : _a.length) || 0}`);
                }
            }
            res.status(201).json(savedPostWithWallOwner);
        }
        catch (error) {
            console.error('Ошибка при создании поста на стене:', error);
            res.status(500).json({
                message: 'Ошибка при создании поста на стене',
                error: error.message
            });
        }
    }
    // Удаление записи со стены
    async deleteWallPost(req, res) {
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
        }
        catch (error) {
            console.error('Ошибка при удалении записи со стены:', error);
            return res.status(500).json({ message: 'Ошибка при удалении записи со стены' });
        }
    }
    // Обновление записи на стене
    async updateWallPost(req, res) {
        try {
            const { postId } = req.params;
            const { content, photoIds, trackIds, albumIds } = req.body;
            console.log(`[WallController] Обновление wall поста ${postId}`);
            console.log('Новый контент:', content);
            console.log('Новые ID фотографий:', photoIds);
            console.log('Новые ID треков:', trackIds);
            console.log('Новые ID альбомов:', albumIds);
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
                const photoRepository = db_connect_1.AppDataSource.getRepository(photo_entity_1.Photo);
                const photos = await photoRepository.findBy({ id: (0, typeorm_1.In)(photoIds.map(id => Number(id))) });
                post.photos = photos;
                console.log(`[WallController] Установлено ${photos.length} фотографий для поста ${postId}`);
            }
            // Обновляем треки
            if (trackIds && Array.isArray(trackIds)) {
                const tracks = await this.musicTrackRepository.findBy({
                    id: (0, typeorm_1.In)(trackIds.map(id => Number(id)))
                });
                post.tracks = tracks;
                console.log(`[WallController] Установлено ${tracks.length} треков для поста ${postId}`);
            }
            // Сохраняем изменения
            await this.postRepository.save(post);
            // Обновляем альбомы, если указаны
            if (albumIds && Array.isArray(albumIds)) {
                // Удаляем текущие связи с альбомами
                await db_connect_1.AppDataSource.query(`
                    DELETE FROM post_album
                    WHERE "postId" = $1
                `, [postId]);
                // Создаем новые связи с альбомами
                for (const albumId of albumIds) {
                    await db_connect_1.AppDataSource.query(`
                        INSERT INTO post_album ("postId", "albumId", "wallPostId")
                        VALUES ($1, $2, NULL)
                    `, [postId, albumId]);
                }
                console.log(`[WallController] Обновлены альбомы для поста ${postId}`);
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
        }
        catch (error) {
            console.error('Ошибка при обновлении поста:', error);
            return res.status(500).json({ message: 'Ошибка при обновлении поста' });
        }
    }
}
exports.WallController = WallController;
