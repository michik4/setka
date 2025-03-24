import { Request, Response } from 'express';
import { Post } from '../entities/post.entity';
import { AppDataSource } from '../db/db_connect';

export class PostController {
    private get postRepository() {
        return AppDataSource.getRepository(Post);
    }

    // Получение всех постов
    public getAllPosts = async (req: Request, res: Response): Promise<void> => {
        try {
            console.log('[PostController] Запрос на получение всех постов');
            const posts = await this.postRepository
                .createQueryBuilder('post')
                .leftJoinAndSelect('post.author', 'author')
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
                where: { id: Number(id) }
            });
            
            if (!post) {
                res.status(404).json({ message: 'Пост не найден' });
                return;
            }
            
            await this.postRepository.update(id, {
                content,
                photos: photoIds?.map((id: number) => ({ id }))
            });
            
            post = await this.postRepository.findOne({
                where: { id: Number(id) },
                relations: ['author', 'photos']
            });
            
            res.json(post);
        } catch (error) {
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
} 