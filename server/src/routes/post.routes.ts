import { Router, Request, Response } from 'express';
import { PostController } from '../controllers/post.controller';
import { authenticateSession, AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();
let postController: PostController | null = null;

// Инициализация контроллера
const initializeController = (): PostController => {
    if (!postController) {
        postController = new PostController();
    }
    return postController;
};

// Логирование всех запросов к постам
router.use((req: Request, res: Response, next) => {
    console.log(`[Posts Route] Получен запрос: ${req.method} ${req.baseUrl}${req.path}`);
    console.log('Query:', req.query);
    console.log('Params:', req.params);
    next();
});

// Получение всех постов
router.get('/', authenticateSession, (req: Request, res: Response) => {
    console.log('[Posts] Запрос на получение всех постов');
    initializeController().getAllPosts(req, res);
});

// Получение постов пользователя (должен быть перед /:id)
router.get('/user/:userId', authenticateSession, (req: Request, res: Response) => {
    console.log('[Posts] Запрос на получение постов пользователя:', req.params.userId);
    initializeController().getUserPosts(req, res);
});

// Создание нового поста
router.post('/', authenticateSession, (req: Request, res: Response) => {
    initializeController().createPost(req, res);
});

// Поставить/убрать лайк
router.post('/:id/like', authenticateSession, (req: Request, res: Response) => {
    initializeController().toggleLike(req as AuthenticatedRequest, res);
});

// Проверить статус лайка
router.get('/:id/like', authenticateSession, (req: Request, res: Response) => {
    initializeController().checkLike(req as AuthenticatedRequest, res);
});

// Получение поста по ID (должен быть последним)
router.get('/:id', authenticateSession, (req: Request, res: Response) => {
    console.log('[Posts] Запрос на получение поста по ID:', req.params.id);
    initializeController().getPostById(req, res);
});

// Обновление поста
router.put('/:id', authenticateSession, (req: Request, res: Response) => {
    initializeController().updatePost(req, res);
});

// Удаление поста
router.delete('/:id', authenticateSession, (req: Request, res: Response) => {
    initializeController().deletePost(req, res);
});

export default router; 