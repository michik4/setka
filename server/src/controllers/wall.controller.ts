import { Response } from 'express';
import { AppDataSource } from '../db/db_connect';
import { WallPost } from '../entities/wall.entity';
import { User } from '../entities/user.entity';
import { AuthenticatedRequest } from '../types/express';
import { Photo } from '../entities/photo.entity';

export class WallController {
    private wallPostRepository = AppDataSource.getRepository(WallPost);
    private userRepository = AppDataSource.getRepository(User);

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

            const [posts, total] = await queryBuilder.getManyAndCount();

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

    // Создание новой записи на стене
    async createWallPost(req: AuthenticatedRequest, res: Response) {
        try {
            const { content, wallOwnerId, photoIds } = req.body;
            const authorId = req.user.id;

            // Проверяем количество фотографий
            if (photoIds && photoIds.length > 4) {
                res.status(400).json({ message: 'Превышено максимальное количество фотографий (4)' });
                return;
            }

            const wallPost = this.wallPostRepository.create({
                content,
                authorId,
                wallOwnerId: parseInt(wallOwnerId)
            });

            // Если есть фотографии, находим их и связываем с постом
            if (photoIds && Array.isArray(photoIds)) {
                const photoRepository = AppDataSource.getRepository(Photo);
                const photos = await photoRepository.findByIds(photoIds);
                wallPost.photos = photos;
            }

            await this.wallPostRepository.save(wallPost);

            // Загружаем пост с отношениями для ответа
            const savedPost = await this.wallPostRepository
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

            res.status(201).json(savedPost);
        } catch (error) {
            console.error('Error creating wall post:', error);
            res.status(500).json({ message: 'Error creating wall post' });
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