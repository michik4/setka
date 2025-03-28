import { Request, Response } from 'express';
import { Post } from '../entities/post.entity';
import { AppDataSource } from '../db/db_connect';
import { Photo } from '../entities/photo.entity';
import { Like } from '../entities/like.entity';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { WallPost } from '../entities/wall.entity';

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

    // Получение всех постов
    public getAllPosts = async (req: Request, res: Response): Promise<void> => {
        try {
            console.log('[PostController] Запрос на получение всех постов');
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
                .orderBy('post.createdAt', 'DESC')
                .getMany();

            console.log(`[PostController] Найдено ${posts.length} постов`);
            console.log('[PostController] Структура первого поста:', posts.length > 0 ? JSON.stringify(posts[0], null, 2) : 'нет постов');
            console.log('[PostController] Отправка ответа клиенту');
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
                .where('post.id = :id', { id })
                .getOne();
            
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
        try {
            const { content, authorId, photoIds } = req.body;
            
            // Проверяем количество фотографий
            if (photoIds && photoIds.length > 4) {
                res.status(400).json({ message: 'Превышено максимальное количество фотографий (4)' });
                return;
            }
            
            const newPost = this.postRepository.create({
                content,
                authorId,
                photos: photoIds?.map((id: number) => ({ id }))
            });

            await this.postRepository.save(newPost);
            
            const savedPost = await this.postRepository.findOne({
                where: { id: newPost.id },
                relations: ['author', 'photos']
            });
            
            res.status(201).json(savedPost);
        } catch (error) {
            res.status(500).json({ message: 'Ошибка при создании поста', error });
        }
    };

    // Обновление поста
    public updatePost = async (req: Request, res: Response): Promise<void> => {
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
                const photoRepository = AppDataSource.getRepository(Photo);
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
        } catch (error) {
            console.error('[PostController] Ошибка при получении постов с фотографией:', error);
            res.status(500).json({ message: 'Ошибка при получении постов', error });
        }
    };
} 