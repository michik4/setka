import { Router, Request, Response, NextFunction } from 'express';
import { WallController } from '../controllers/wall.controller';
import { authenticateSession, AuthenticatedRequest } from '../middleware/auth.middleware';
import { PostController } from '../controllers/post.controller';

const router = Router();
const wallController = new WallController();
const postController = new PostController();

// Middleware для приведения типов
const handleRequest = (handler: (req: AuthenticatedRequest, res: Response) => Promise<any>) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await handler(req as AuthenticatedRequest, res);
        } catch (error) {
            next(error);
        }
    };
};

// Получение записей со стены пользователя
router.get('/:userId', authenticateSession, handleRequest(wallController.getWallPosts.bind(wallController)));

// Создание новой записи на стене
router.post('/', authenticateSession, handleRequest(wallController.createWallPost.bind(wallController)));

// Удаление записи со стены
router.delete('/:postId', authenticateSession, handleRequest(wallController.deleteWallPost.bind(wallController)));

// Редактирование записи на стене
router.put('/:postId', authenticateSession, handleRequest(wallController.updateWallPost.bind(wallController)));

// Поставить/убрать лайк посту на стене
router.post('/:id/like', authenticateSession, handleRequest(postController.toggleLike.bind(postController)));

// Проверить статус лайка поста на стене
router.get('/:id/like', authenticateSession, handleRequest(postController.checkLike.bind(postController)));

export default router; 