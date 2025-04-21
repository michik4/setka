import { Router, Request, Response, NextFunction } from 'express';
import { WallController } from '../controllers/wall.controller';
import { authenticateSession, AuthenticatedRequest } from '../middleware/auth.middleware';
import { PostController } from '../controllers/post.controller';
import multer from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';

const router = Router();
const wallController = new WallController();
const postController = new PostController();

// Настройка хранилища для загрузки файлов
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../uploads/'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = randomUUID();
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// Настраиваем multer с дополнительными опциями
const upload = multer({ 
    storage,
    // Лимит размера файла - 10 МБ
    limits: {
        fileSize: 10 * 1024 * 1024
    },
    // Разрешаем только изображения
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Разрешены только изображения'));
        }
    }
});

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

// Создание новой записи на стене (устаревший эндпоинт, сохранен для обратной совместимости)
router.post('/', authenticateSession, handleRequest(wallController.createWallPost.bind(wallController)));

// Новый эндпоинт для создания поста на стене с поддержкой загрузки файлов
router.post('/posts', authenticateSession, upload.array('photos', 20), handleRequest(wallController.createWallPost.bind(wallController)));

// Удаление записи со стены
router.delete('/:postId', authenticateSession, handleRequest(wallController.deleteWallPost.bind(wallController)));

// Редактирование записи на стене
router.put('/:postId', authenticateSession, handleRequest(wallController.updateWallPost.bind(wallController)));

// Поставить/убрать лайк посту на стене
router.post('/:id/like', authenticateSession, handleRequest(postController.toggleLike.bind(postController)));

// Проверить статус лайка поста на стене
router.get('/:id/like', authenticateSession, handleRequest(postController.checkLike.bind(postController)));

export default router; 