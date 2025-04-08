"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostController = void 0;
const post_entity_1 = require("../entities/post.entity");
const db_connect_1 = require("../db/db_connect");
const photo_entity_1 = require("../entities/photo.entity");
const like_entity_1 = require("../entities/like.entity");
const wall_entity_1 = require("../entities/wall.entity");
const album_entity_1 = require("../entities/album.entity");
class PostController {
    constructor() {
        // Получение всех постов
        this.getAllPosts = async (req, res) => {
            try {
                console.log('[PostController] Запрос на получение всех постов');
                const postsQuery = await this.postRepository
                    .createQueryBuilder('post')
                    .leftJoinAndSelect('post.author', 'author')
                    .leftJoinAndSelect('author.avatar', 'authorAvatar')
                    .leftJoinAndSelect('post.photos', 'photos')
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
                    'photos.path'
                ])
                    .orderBy('post.createdAt', 'DESC')
                    .getMany();
                // Для каждого поста загружаем альбомы
                const posts = [];
                try {
                    for (const post of postsQuery) {
                        const postWithAlbums = await this.getPostWithRelations(post.id);
                        if (postWithAlbums) {
                            posts.push(postWithAlbums);
                        }
                        else {
                            posts.push({ ...post, albums: [] });
                        }
                    }
                }
                catch (error) {
                    console.error('Ошибка при загрузке альбомов для постов:', error);
                    // В случае ошибки добавляем посты без альбомов
                    posts.push(...postsQuery.map(post => ({ ...post, albums: [] })));
                }
                console.log(`[PostController] Найдено ${posts.length} постов`);
                res.json(posts);
            }
            catch (error) {
                console.error('[PostController] Ошибка при получении постов:', error);
                res.status(500).json({ message: 'Ошибка при получении постов', error });
            }
        };
        // Получение поста по ID
        this.getPostById = async (req, res) => {
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
            }
            catch (error) {
                console.error('[PostController] Ошибка при получении поста:', error);
                res.status(500).json({ message: 'Ошибка при получении поста', error });
            }
        };
        // Создание нового поста
        this.createPost = async (req, res) => {
            try {
                console.log('Body поста:', req.body);
                console.log('Файлы:', req.files);
                const { content, authorId } = req.body;
                let albums = req.body.albums;
                // Проверяем, есть ли albums в JSON формате и преобразуем его
                if (albums && typeof albums === 'string') {
                    try {
                        albums = JSON.parse(albums);
                    }
                    catch (error) {
                        console.error('Ошибка при парсинге JSON albums:', error);
                    }
                }
                const photos = req.files;
                console.log('Создание поста с данными:', {
                    content,
                    authorId,
                    albumsCount: (albums === null || albums === void 0 ? void 0 : albums.length) || 0,
                    photosCount: (photos === null || photos === void 0 ? void 0 : photos.length) || 0
                });
                // Проверяем количество фотографий
                if (photos && photos.length > 4) {
                    res.status(400).json({ message: 'Превышено максимальное количество фотографий (4)' });
                    return;
                }
                // Создаем новый пост
                const newPost = this.postRepository.create({
                    content,
                    authorId: parseInt(authorId)
                });
                // Сохраняем пост
                const savedPost = await this.postRepository.save(newPost);
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
                        const savedPhoto = await db_connect_1.AppDataSource.getRepository(photo_entity_1.Photo).save(photo);
                        photoEntities.push(savedPhoto);
                    }
                    // Связываем фотографии с постом
                    newPost.photos = photoEntities;
                    await this.postRepository.save(newPost);
                }
                // Если есть альбомы, связываем их с постом
                if (albums && albums.length > 0) {
                    console.log(`Найдено ${albums.length} альбомов для привязки к посту ${savedPost.id}`);
                    // Находим альбомы по ID
                    for (const albumId of albums) {
                        try {
                            const album = await db_connect_1.AppDataSource.getRepository(album_entity_1.Album).findOneBy({ id: albumId });
                            if (album) {
                                // Создаем запись в таблице связей напрямую через SQL
                                await db_connect_1.AppDataSource.query(`
                                INSERT INTO post_album ("postId", "albumId")
                                VALUES ($1, $2)
                            `, [savedPost.id, album.id]);
                                console.log(`Привязан альбом ${album.id} к посту ${savedPost.id}`);
                            }
                            else {
                                console.log(`Альбом с ID ${albumId} не найден`);
                            }
                        }
                        catch (error) {
                            console.error(`Ошибка при связывании поста ${savedPost.id} с альбомом ${albumId}:`, error);
                        }
                    }
                }
                // Загружаем пост с отношениями включая альбомы
                const postWithRelations = await this.getPostWithRelations(newPost.id);
                res.status(201).json(postWithRelations);
            }
            catch (error) {
                console.error('Ошибка при создании поста:', error);
                res.status(500).json({ message: 'Ошибка при создании поста', error: error.message });
            }
        };
        // Обновление поста
        this.updatePost = async (req, res) => {
            try {
                const { id } = req.params;
                const { content, photoIds } = req.body;
                let post = await this.postRepository.findOne({
                    where: { id: Number(id) },
                    relations: ['photos']
                });
                if (!post) {
                    res.status(404).json({ message: 'Пост не найден' });
                    return;
                }
                // Обновляем текст
                post.content = content;
                // Обновляем фотографии
                if (photoIds && Array.isArray(photoIds)) {
                    const photoRepository = db_connect_1.AppDataSource.getRepository(photo_entity_1.Photo);
                    const photos = await photoRepository.findByIds(photoIds);
                    post.photos = photos;
                }
                // Сохраняем обновленный пост
                await this.postRepository.save(post);
                // Загружаем обновленный пост со всеми связями
                post = await this.postRepository
                    .createQueryBuilder('post')
                    .leftJoinAndSelect('post.author', 'author')
                    .leftJoinAndSelect('author.avatar', 'authorAvatar')
                    .leftJoinAndSelect('post.photos', 'photos')
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
                    'photos.path'
                ])
                    .where('post.id = :id', { id: Number(id) })
                    .getOne();
                res.json(post);
            }
            catch (error) {
                console.error('[PostController] Ошибка при обновлении поста:', error);
                res.status(500).json({ message: 'Ошибка при обновлении поста', error });
            }
        };
        // Удаление поста
        this.deletePost = async (req, res) => {
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
            }
            catch (error) {
                res.status(500).json({ message: 'Ошибка при удалении поста', error });
            }
        };
        // Получение постов пользователя
        this.getUserPosts = async (req, res) => {
            try {
                const userId = Number(req.params.userId);
                console.log(`[PostController] Запрос на получение постов пользователя: ${userId}`);
                const posts = await this.postRepository
                    .createQueryBuilder('post')
                    .leftJoinAndSelect('post.author', 'author')
                    .leftJoinAndSelect('author.avatar', 'authorAvatar')
                    .leftJoinAndSelect('post.photos', 'photos')
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
                    'photos.path'
                ])
                    .where('post.authorId = :userId', { userId })
                    .orderBy('post.createdAt', 'DESC')
                    .getMany();
                console.log(`[PostController] Найдено ${posts.length} постов пользователя ${userId}`);
                res.json(posts);
            }
            catch (error) {
                console.error('[PostController] Ошибка при получении постов пользователя:', error);
                res.status(500).json({ message: 'Ошибка при получении постов пользователя', error });
            }
        };
        // Поставить/убрать лайк посту
        this.toggleLike = async (req, res) => {
            try {
                const postId = Number(req.params.id);
                const userId = req.user.id;
                console.log(`[PostController] Запрос на установку/снятие лайка для поста ${postId} от пользователя ${userId}`);
                // Проверяем существование поста
                const post = await db_connect_1.AppDataSource
                    .getRepository(wall_entity_1.WallPost)
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
                    await db_connect_1.AppDataSource.getRepository(wall_entity_1.WallPost).save(post);
                    response = { liked: false, likesCount: post.likesCount };
                }
                else {
                    console.log(`[PostController] Лайк не найден, создаем новый`);
                    // Если лайка нет - создаем
                    const newLike = this.likeRepository.create({
                        userId: userId,
                        wallPostId: postId
                    });
                    await this.likeRepository.save(newLike);
                    post.likesCount++;
                    await db_connect_1.AppDataSource.getRepository(wall_entity_1.WallPost).save(post);
                    response = { liked: true, likesCount: post.likesCount };
                }
                console.log(`[PostController] Отправляем ответ:`, response);
                res.json(response);
            }
            catch (error) {
                console.error('[PostController] Ошибка при обработке лайка:', error);
                const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
                res.status(500).json({ message: 'Ошибка при обработке лайка', error: errorMessage });
            }
        };
        // Проверить, лайкнул ли пользователь пост
        this.checkLike = async (req, res) => {
            try {
                console.log('[PostController] Запрос на проверку лайка');
                const postId = Number(req.params.id);
                const userId = req.user.id;
                console.log(`[PostController] Проверка лайка для поста ${postId} от пользователя ${userId}`);
                // Проверяем, является ли пост записью на стене
                const wallPost = await db_connect_1.AppDataSource
                    .getRepository(wall_entity_1.WallPost)
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
            }
            catch (error) {
                console.error('[PostController] Ошибка при проверке лайка:', error);
                res.status(500).json({ message: 'Ошибка при проверке лайка' });
            }
        };
        // Получение постов с определенной фотографией
        this.getPostsWithPhoto = async (req, res) => {
            try {
                const { photoId } = req.params;
                // Получаем обычные посты с этой фотографией
                const posts = await this.postRepository
                    .createQueryBuilder('post')
                    .leftJoinAndSelect('post.photos', 'photos')
                    .where('photos.id = :photoId', { photoId })
                    .getMany();
                // Получаем записи на стене с этой фотографией
                const wallPosts = await this.wallPostRepository
                    .createQueryBuilder('wallPost')
                    .leftJoinAndSelect('wallPost.photos', 'photos')
                    .where('photos.id = :photoId', { photoId })
                    .getMany();
                // Объединяем результаты
                const allPosts = [...posts, ...wallPosts];
                res.json(allPosts);
            }
            catch (error) {
                console.error('[PostController] Ошибка при получении постов с фотографией:', error);
                res.status(500).json({ message: 'Ошибка при получении постов', error });
            }
        };
    }
    get postRepository() {
        return db_connect_1.AppDataSource.getRepository(post_entity_1.Post);
    }
    get likeRepository() {
        return db_connect_1.AppDataSource.getRepository(like_entity_1.Like);
    }
    get wallPostRepository() {
        return db_connect_1.AppDataSource.getRepository(wall_entity_1.WallPost);
    }
    // Получение сохраненный пост со всеми связями
    async getPostWithRelations(postId) {
        try {
            // Получаем пост с основными связями
            const post = await this.postRepository
                .createQueryBuilder('post')
                .leftJoinAndSelect('post.author', 'author')
                .leftJoinAndSelect('author.avatar', 'authorAvatar')
                .leftJoinAndSelect('post.photos', 'photos')
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
                'photos.path'
            ])
                .where('post.id = :id', { id: postId })
                .getOne();
            if (post) {
                try {
                    // Загружаем альбомы напрямую через SQL-запрос
                    const albumsQuery = await db_connect_1.AppDataSource.query(`
                        SELECT a.* FROM album a
                        JOIN post_album pa ON a.id = pa."albumId"
                        WHERE pa."postId" = $1
                    `, [postId]);
                    if (albumsQuery && albumsQuery.length > 0) {
                        console.log(`Загружено ${albumsQuery.length} альбомов для поста ${postId}`);
                        // Загружаем фотографии для каждого альбома
                        for (const album of albumsQuery) {
                            const photosQuery = await db_connect_1.AppDataSource.query(`
                                SELECT p.* FROM photo p
                                JOIN album_photo ap ON p.id = ap."photoId"
                                WHERE ap."albumId" = $1
                                LIMIT 5
                            `, [album.id]);
                            album.photos = photosQuery || [];
                        }
                        // Добавляем albums к посту
                        post.albums = albumsQuery;
                    }
                    else {
                        console.log(`Не найдено альбомов для поста ${postId}`);
                        post.albums = [];
                    }
                }
                catch (error) {
                    console.error('Ошибка при загрузке альбомов:', error);
                    post.albums = [];
                }
            }
            return post;
        }
        catch (error) {
            console.error(`Ошибка при получении поста ${postId}:`, error);
            return null;
        }
    }
}
exports.PostController = PostController;
