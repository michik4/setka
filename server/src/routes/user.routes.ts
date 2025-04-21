import { Router, Request, Response, NextFunction } from 'express'
import { UserService } from '../services/user.service'
import { UserController } from '../controllers/user.controller'
import { AppDataSource } from '../db/db_connect'
import { authenticateSession } from '../middleware/auth.middleware'
import { upload } from '../utils/upload'
import { User } from '../entities/user.entity'
import { Photo } from '../entities/photo.entity'
import { AuthenticatedRequest } from '../types/express'
import multer from 'multer'

const router = Router()
const userService = new UserService()
const userController = new UserController(userService)

// Публичные маршруты
router.post('/', userController.createUser.bind(userController))
router.post('/random', userController.createRandomUser.bind(userController))

// Защищенные маршруты
router.get('/', authenticateSession, userController.getUsers.bind(userController))
router.get('/email/:email', authenticateSession, userController.getUserByEmail.bind(userController))
router.get('/nickname/:nickname', authenticateSession, userController.getUserByNickname.bind(userController))
router.get('/:id', authenticateSession, userController.getUser.bind(userController))
router.put('/:id', authenticateSession, userController.updateUser.bind(userController))
router.delete('/:id', authenticateSession, userController.deleteUser.bind(userController))
router.put('/:id/status', authenticateSession, userController.updateStatus.bind(userController))

// Обработчик ошибок multer
const handleMulterError = (err: any, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'Файл слишком большой. Максимальный размер 5MB' });
        }
        return res.status(400).json({ message: 'Ошибка при загрузке файла' });
    } else if (err) {
        return res.status(400).json({ message: err.message });
    }
    next();
};

// Обработчик для загрузки аватара с правильной типизацией
router.post(
    '/:id/avatar',
    authenticateSession,
    (req: Request, res: Response, next: NextFunction) => {
        upload.single('avatar')(req, res, (err) => {
            if (err) {
                return handleMulterError(err, req, res, next);
            }
            const authenticatedReq = req as AuthenticatedRequest;
            return userController.uploadAvatar(authenticatedReq, res);
        });
    }
);

export default router 