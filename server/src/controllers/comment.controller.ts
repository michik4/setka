import { Request, Response } from 'express';
import { Comment } from '../entities/comment.entity';
import { Post } from '../entities/post.entity';
import { User } from '../entities/user.entity';
import { GroupMember } from '../entities/group-member.entity';
import { AppDataSource } from '../db/db_connect';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class CommentController {
    private get commentRepository() {
        return AppDataSource.getRepository(Comment);
    }

    private get postRepository() {
        return AppDataSource.getRepository(Post);
    }
    
    private get userRepository() {
        return AppDataSource.getRepository(User);
    }
    
    private get groupMemberRepository() {
        return AppDataSource.getRepository(GroupMember);
    }

    // Получение комментариев к посту
    public getPostComments = async (req: Request, res: Response): Promise<void> => {
        try {
            const postId = Number(req.params.postId);
            const limit = Number(req.query.limit) || 100;
            console.log(`[CommentController] Запрос на получение комментариев для поста ${postId}, лимит: ${limit}`);

            // Найдем пост для получения информации об авторе и группе
            const post = await this.postRepository
                .createQueryBuilder('post')
                .leftJoinAndSelect('post.author', 'postAuthor')
                .leftJoinAndSelect('post.group', 'group')
                .where('post.id = :postId', { postId })
                .getOne();

            if (!post) {
                res.status(404).json({ message: 'Пост не найден' });
                return;
            }

            // Получим список админов группы, если пост от группы
            let groupAdminIds: number[] = [];
            if (post.groupId) {
                const groupAdmins = await this.groupMemberRepository
                    .createQueryBuilder('member')
                    .where('member.groupId = :groupId AND member.isAdmin = true', { groupId: post.groupId })
                    .getMany();
                
                groupAdminIds = groupAdmins.map(admin => admin.userId);
            }

            // Получаем основные комментарии (без родителя)
            const comments = await this.commentRepository
                .createQueryBuilder('comment')
                .leftJoinAndSelect('comment.author', 'author')
                .leftJoinAndSelect('author.avatar', 'avatar')
                .where('comment.postId = :postId AND comment.parentId IS NULL', { postId })
                .orderBy('comment.createdAt', 'ASC')
                .take(limit)
                .select([
                    'comment.id',
                    'comment.content',
                    'comment.postId',
                    'comment.authorId',
                    'comment.parentId',
                    'comment.createdAt',
                    'author.id',
                    'author.firstName',
                    'author.lastName',
                    'author.nickname',
                    'avatar.id',
                    'avatar.path'
                ])
                .getMany();

            // Получаем все ответы на эти комментарии
            const commentIds = comments.map(c => c.id);
            let replies: Comment[] = [];
            
            if (commentIds.length > 0) {
                replies = await this.commentRepository
                    .createQueryBuilder('reply')
                    .leftJoinAndSelect('reply.author', 'author')
                    .leftJoinAndSelect('author.avatar', 'avatar')
                    .where('reply.parentId IN (:...commentIds)', { commentIds })
                    .orderBy('reply.createdAt', 'ASC')
                    .select([
                        'reply.id',
                        'reply.content',
                        'reply.postId',
                        'reply.authorId',
                        'reply.parentId',
                        'reply.createdAt',
                        'author.id',
                        'author.firstName',
                        'author.lastName',
                        'author.nickname',
                        'avatar.id',
                        'avatar.path'
                    ])
                    .getMany();
            }

            // Добавляем ответы к основным комментариям и помечаем особых пользователей
            const result = comments.map(comment => {
                const commentReplies = replies.filter(reply => reply.parentId === comment.id);
                
                // Добавляем флаги для особых пользователей
                const isPostAuthor = comment.authorId === post.authorId;
                const isGroupAdmin = post.groupId ? groupAdminIds.includes(comment.authorId) : false;
                
                // Помечаем ответы с флагами для особых пользователей
                const markedReplies = commentReplies.map(reply => ({
                    ...reply,
                    isPostAuthor: reply.authorId === post.authorId,
                    isGroupAdmin: post.groupId ? groupAdminIds.includes(reply.authorId) : false
                }));
                
                return {
                    ...comment,
                    isPostAuthor,
                    isGroupAdmin,
                    replies: markedReplies
                };
            });

            console.log(`[CommentController] Найдено ${result.length} комментариев для поста ${postId}`);
            res.json(result);
        } catch (error) {
            console.error('[CommentController] Ошибка при получении комментариев:', error);
            res.status(500).json({ message: 'Ошибка при получении комментариев' });
        }
    };

    // Получение количества комментариев к посту
    public getPostCommentsCount = async (req: Request, res: Response): Promise<void> => {
        try {
            const postId = Number(req.params.postId);
            console.log(`[CommentController] Запрос на получение количества комментариев для поста ${postId}`);

            const count = await this.commentRepository
                .createQueryBuilder('comment')
                .where('comment.postId = :postId', { postId })
                .getCount();

            console.log(`[CommentController] Найдено ${count} комментариев для поста ${postId}`);
            res.json({ count });
        } catch (error) {
            console.error('[CommentController] Ошибка при получении количества комментариев:', error);
            res.status(500).json({ message: 'Ошибка при получении количества комментариев' });
        }
    };

    // Добавление комментария
    public addComment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const postId = Number(req.params.postId);
            const { content, parentId } = req.body;
            const authorId = req.user.id;

            console.log(`[CommentController] Добавление комментария к посту ${postId} от пользователя ${authorId}`);

            if (!content || content.trim() === '') {
                res.status(400).json({ message: 'Содержимое комментария не может быть пустым' });
                return;
            }

            // Проверяем существование поста
            const post = await this.postRepository
                .createQueryBuilder('post')
                .leftJoinAndSelect('post.author', 'author')
                .leftJoinAndSelect('post.group', 'group')
                .where('post.id = :id', { id: postId })
                .getOne();

            if (!post) {
                res.status(404).json({ message: 'Пост не найден' });
                return;
            }

            // Проверяем существование родительского комментария, если он указан
            if (parentId) {
                const parentComment = await this.commentRepository.findOne({
                    where: { id: parentId, postId }
                });

                if (!parentComment) {
                    res.status(404).json({ message: 'Родительский комментарий не найден' });
                    return;
                }
            }

            // Получим список админов группы, если пост от группы
            let groupAdminIds: number[] = [];
            if (post.groupId) {
                const groupAdmins = await this.groupMemberRepository
                    .createQueryBuilder('member')
                    .where('member.groupId = :groupId AND member.isAdmin = true', { groupId: post.groupId })
                    .getMany();
                
                groupAdminIds = groupAdmins.map(admin => admin.userId);
            }

            // Создаем новый комментарий
            const comment = new Comment();
            comment.content = content.trim();
            comment.postId = postId;
            comment.authorId = authorId;
            if (parentId) {
                comment.parentId = parentId;
            }

            const savedComment = await this.commentRepository.save(comment);
            console.log(`[CommentController] Сохранен комментарий с ID ${savedComment.id}`);

            // Увеличиваем счетчик комментариев в посте
            post.commentsCount += 1;
            await this.postRepository.save(post);

            // Загружаем полные данные комментария для ответа
            const fullComment = await this.commentRepository
                .createQueryBuilder('comment')
                .leftJoinAndSelect('comment.author', 'author')
                .leftJoinAndSelect('author.avatar', 'avatar')
                .where('comment.id = :id', { id: savedComment.id })
                .select([
                    'comment.id',
                    'comment.content',
                    'comment.postId',
                    'comment.authorId',
                    'comment.parentId',
                    'comment.createdAt',
                    'author.id',
                    'author.firstName',
                    'author.lastName',
                    'author.nickname',
                    'avatar.id',
                    'avatar.path'
                ])
                .getOne();

            // Добавляем информацию о статусе пользователя
            const isPostAuthor = authorId === post.authorId;
            const isGroupAdmin = post.groupId ? groupAdminIds.includes(authorId) : false;

            res.status(201).json({
                ...fullComment,
                isPostAuthor,
                isGroupAdmin,
                replies: []
            });
        } catch (error) {
            console.error('[CommentController] Ошибка при добавлении комментария:', error);
            res.status(500).json({ message: 'Ошибка при добавлении комментария' });
        }
    };

    // Удаление комментария
    public deleteComment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const commentId = Number(req.params.commentId);
            const userId = req.user.id;

            console.log(`[CommentController] Удаление комментария ${commentId} пользователем ${userId}`);

            // Находим комментарий
            const comment = await this.commentRepository.findOne({
                where: { id: commentId }
            });

            if (!comment) {
                res.status(404).json({ message: 'Комментарий не найден' });
                return;
            }

            // Находим пост для проверки прав доступа
            const post = await this.postRepository.findOne({
                where: { id: comment.postId }
            });

            if (!post) {
                res.status(404).json({ message: 'Пост не найден' });
                return;
            }

            // Проверяем, является ли пользователь автором комментария
            const isCommentAuthor = comment.authorId === userId;
            
            // Проверяем, является ли пользователь автором поста
            const isPostAuthor = post.authorId === userId;
            
            // Проверяем, является ли пользователь админом группы, если пост от группы
            let isGroupAdmin = false;
            if (post.groupId) {
                const adminRecord = await this.groupMemberRepository.findOne({
                    where: { 
                        groupId: post.groupId, 
                        userId: userId,
                        isAdmin: true 
                    }
                });
                isGroupAdmin = !!adminRecord;
            }

            // Проверяем права доступа
            if (!isCommentAuthor && !isPostAuthor && !isGroupAdmin) {
                res.status(403).json({ message: 'У вас нет прав для удаления этого комментария' });
                return;
            }

            // Подсчитываем, сколько комментариев будет удалено (родительский + все ответы)
            let commentsToDeleteCount = 1; // сам комментарий
            
            // Если это родительский комментарий, добавляем количество ответов
            if (!comment.parentId) {
                const repliesCount = await this.commentRepository
                    .createQueryBuilder('comment')
                    .where('comment.parentId = :commentId', { commentId })
                    .getCount();
                
                commentsToDeleteCount += repliesCount;
            }

            // Удаляем комментарий
            await this.commentRepository.remove(comment);
            console.log(`[CommentController] Комментарий ${commentId} успешно удален`);

            // Обновляем счетчик комментариев в посте
            if (post) {
                post.commentsCount = Math.max(0, post.commentsCount - commentsToDeleteCount);
                await this.postRepository.save(post);
            }

            res.status(200).json({ 
                message: 'Комментарий успешно удален',
                deletedCount: commentsToDeleteCount
            });
        } catch (error) {
            console.error('[CommentController] Ошибка при удалении комментария:', error);
            res.status(500).json({ message: 'Ошибка при удалении комментария' });
        }
    };
} 