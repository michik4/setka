import { Router, Request, Response, NextFunction } from 'express';
import { AlbumController } from '../controllers/album.controller';
import { authenticateSession, AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();
const albumController = new AlbumController();

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

// Получение альбомов пользователя
router.get('/user/:userId', authenticateSession, handleRequest(albumController.getUserAlbums.bind(albumController)));

// Получение конкретного альбома
router.get('/:albumId', authenticateSession, handleRequest(albumController.getAlbum.bind(albumController)));

// Получение обложки альбома
router.get('/:albumId/cover', authenticateSession, handleRequest(albumController.getAlbumCover.bind(albumController)));

// Создание нового альбома (требует авторизации)
router.post('/', authenticateSession, handleRequest(albumController.createAlbum.bind(albumController)));

// Обновление информации об альбоме (требует авторизации)
router.put('/:albumId', authenticateSession, handleRequest(albumController.updateAlbum.bind(albumController)));

// Добавление фотографий в альбом (требует авторизации)
router.post('/:albumId/photos', authenticateSession, handleRequest(albumController.addPhotosToAlbum.bind(albumController)));

// Удаление фотографий из альбома (требует авторизации)
router.delete('/:albumId/photos', authenticateSession, handleRequest(albumController.removePhotosFromAlbum.bind(albumController)));

// Удаление альбома (требует авторизации)
router.delete('/:albumId', authenticateSession, handleRequest(albumController.deleteAlbum.bind(albumController)));

export default router; 