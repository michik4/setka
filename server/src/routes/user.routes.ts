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
import path from 'path'
import fs from 'fs'

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
router.get('/:id', authenticateSession, userController.getUserById.bind(userController))
router.put('/:id', authenticateSession, userController.updateUser.bind(userController))
router.delete('/:id', authenticateSession, userController.deleteUser.bind(userController))
router.put('/:id/status', authenticateSession, userController.updateStatus.bind(userController))

// Маршрут для получения аватара пользователя
router.get('/:id/avatar', async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.id);
        if (isNaN(userId)) {
            return res.status(400).json({ message: 'Неверный идентификатор пользователя' });
        }

        // Получаем пользователя с аватаром
        const user = await AppDataSource.getRepository(User)
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.avatar', 'avatar')
            .where('user.id = :id', { id: userId })
            .getOne();

        if (!user || !user.avatar) {
            // Если аватар не найден, возвращаем аватар по умолчанию
            const defaultAvatarPath = path.join(__dirname, '../../public/default-avatar.png');
            if (fs.existsSync(defaultAvatarPath)) {
                return res.sendFile(defaultAvatarPath);
            }
            return res.status(404).json({ message: 'Аватар пользователя не найден' });
        }

        // Путь к файлу аватара
        const avatarPath = path.join(__dirname, '../../uploads/photos', user.avatar.path);
        
        // Проверяем существование файла
        if (!fs.existsSync(avatarPath)) {
            // Если файл не найден, возвращаем аватар по умолчанию
            const defaultAvatarPath = path.join(__dirname, '../../public/default-avatar.png');
            if (fs.existsSync(defaultAvatarPath)) {
                return res.sendFile(defaultAvatarPath);
            }
            return res.status(404).json({ message: 'Файл аватара не найден' });
        }

        // Отправляем файл
        res.sendFile(avatarPath);
    } catch (error) {
        console.error('Ошибка при получении аватара пользователя:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера' });
    }
});

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