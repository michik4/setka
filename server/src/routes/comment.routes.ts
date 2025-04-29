import { Router, Request, Response } from 'express';
import { CommentController } from '../controllers/comment.controller';
import { authenticateSession, AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();
let commentController: CommentController | null = null;

// Инициализация контроллера
const initializeController = (): CommentController => {
    if (!commentController) {
        commentController = new CommentController();
    }
    return commentController;
};

// Получение комментариев к посту
router.get('/post/:postId', (req: Request, res: Response) => {
    console.log('[Comment Routes] Запрос на получение комментариев к посту');
    initializeController().getPostComments(req, res);
});

// Получение количества комментариев к посту
router.get('/post/:postId/count', (req: Request, res: Response) => {
    console.log('[Comment Routes] Запрос на получение количества комментариев к посту');
    initializeController().getPostCommentsCount(req, res);
});

// Добавление комментария к посту (включая ответы на комментарии)
router.post('/post/:postId', authenticateSession, (req: Request, res: Response) => {
    console.log('[Comment Routes] Запрос на добавление комментария к посту');
    initializeController().addComment(req as AuthenticatedRequest, res);
});

// Удаление комментария
router.delete('/:commentId', authenticateSession, (req: Request, res: Response) => {
    console.log('[Comment Routes] Запрос на удаление комментария');
    initializeController().deleteComment(req as AuthenticatedRequest, res);
});

export default router; 