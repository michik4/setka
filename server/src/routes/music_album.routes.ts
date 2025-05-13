import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { authenticateSession } from '../middleware/auth.middleware';
import musicAlbumController from '../controllers/music_album.controller';
import { AuthenticatedRequest } from '../types/auth.types';

const router = Router();

// Настройка хранилища для multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadDir;
        
        if (file.fieldname === 'audioFile' || file.fieldname === 'audioFiles') {
            uploadDir = path.join(__dirname, '../../uploads/music');
        } else if (file.fieldname === 'coverImage') {
            uploadDir = path.join(__dirname, '../../uploads/covers');
        } else {
            uploadDir = path.join(__dirname, '../../uploads/other');
        }
        
        // Создаем директорию, если она не существует
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        // Для отладки
        console.log(`[Storage] Сохранение файла ${file.fieldname} (${file.originalname}) в директорию ${uploadDir}`);
        
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueFileName = `${uuidv4()}${path.extname(file.originalname)}`;
        console.log(`[Storage] Генерация имени файла: ${uniqueFileName} для ${file.originalname}`);
        cb(null, uniqueFileName);
    }
});

// Получение всех альбомов пользователя
router.get('/', authenticateSession, (req: Request, res: Response, next: NextFunction) => {
    const authenticatedReq = req as AuthenticatedRequest;
    musicAlbumController.getUserAlbums(authenticatedReq, res);
});

// Получение альбома по ID
router.get('/:albumId', authenticateSession, (req: Request, res: Response, next: NextFunction) => {
    const authenticatedReq = req as AuthenticatedRequest;
    musicAlbumController.getAlbumById(authenticatedReq, res);
});

// Создание нового альбома
router.post('/', authenticateSession, (req: Request, res: Response, next: NextFunction) => {
    const authenticatedReq = req as AuthenticatedRequest;
    musicAlbumController.createAlbum(authenticatedReq, res);
});

// Обновление альбома
router.put('/:albumId', authenticateSession, (req: Request, res: Response, next: NextFunction) => {
    const authenticatedReq = req as AuthenticatedRequest;
    musicAlbumController.updateAlbum(authenticatedReq, res);
});

// Удаление альбома
router.delete('/:albumId', authenticateSession, (req: Request, res: Response, next: NextFunction) => {
    const authenticatedReq = req as AuthenticatedRequest;
    musicAlbumController.deleteAlbum(authenticatedReq, res);
});

// Добавление трека в альбом
router.post('/:albumId/tracks', authenticateSession, (req: Request, res: Response, next: NextFunction) => {
    const authenticatedReq = req as AuthenticatedRequest;
    musicAlbumController.addTrackToAlbum(authenticatedReq, res);
});

// Удаление трека из альбома
router.delete('/:albumId/tracks/:trackId', authenticateSession, (req: Request, res: Response, next: NextFunction) => {
    const authenticatedReq = req as AuthenticatedRequest;
    musicAlbumController.removeTrackFromAlbum(authenticatedReq, res);
});

// Загрузка обложки альбома
router.post('/:albumId/cover', authenticateSession, (req: Request, res: Response, next: NextFunction) => {
    multer({ storage }).single('coverImage')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ message: 'Ошибка при загрузке файла' });
        }
        const authenticatedReq = req as AuthenticatedRequest;
        musicAlbumController.uploadAlbumCover(authenticatedReq, res);
    });
});

// Загрузка нескольких треков сразу в альбом
router.post('/:albumId/upload/tracks', authenticateSession, (req: Request, res: Response, next: NextFunction) => {
    multer({
        storage,
        limits: {
            fileSize: 100 * 1024 * 1024 // 100 MB
        }
    }).array('audioFiles', 20)(req, res, (err) => {
        if (err) {
            return res.status(400).json({ message: 'Ошибка при загрузке файлов' });
        }
        const authenticatedReq = req as AuthenticatedRequest;
        musicAlbumController.uploadTracksToAlbum(authenticatedReq, res);
    });
});

// Установка обложки альбома из URL трека
router.post('/:albumId/cover-from-track', authenticateSession, (req: Request, res: Response, next: NextFunction) => {
    const authenticatedReq = req as AuthenticatedRequest;
    musicAlbumController.setCoverFromUrl(authenticatedReq, res);
});

// Добавление альбома в библиотеку пользователя
router.post('/:albumId/add-to-library', authenticateSession, (req: Request, res: Response, next: NextFunction) => {
    const authenticatedReq = req as AuthenticatedRequest;
    musicAlbumController.addAlbumToLibrary(authenticatedReq, res);
});

// Удаление альбома из библиотеки пользователя
router.delete('/:albumId/remove-from-library', authenticateSession, (req: Request, res: Response, next: NextFunction) => {
    const authenticatedReq = req as AuthenticatedRequest;
    musicAlbumController.removeAlbumFromLibrary(authenticatedReq, res);
});

// Проверка наличия альбома в библиотеке пользователя
router.get('/:albumId/in-library', authenticateSession, async (req: Request, res: Response) => {
    try {
        const authenticatedReq = req as AuthenticatedRequest;
        const albumId = parseInt(req.params.albumId);
        const userId = authenticatedReq.user?.id;
        
        if (isNaN(albumId)) {
            return res.status(400).json({ message: 'Некорректный ID альбома' });
        }
        
        if (!userId) {
            return res.status(401).json({ message: 'Пользователь не аутентифицирован' });
        }
        
        console.log(`[MusicAlbum] Проверка наличия альбома ID:${albumId} в библиотеке пользователя ID:${userId}`);
        
        // Делегируем проверку контроллеру
        const isInLibrary = await musicAlbumController.checkAlbumInLibrary(albumId, userId);
        
        return res.status(200).json({
            inLibrary: isInLibrary
        });
    } catch (error) {
        console.error('[MusicAlbum] Ошибка при проверке наличия альбома в библиотеке:', error);
        return res.status(500).json({ message: 'Не удалось проверить наличие альбома в библиотеке' });
    }
});

export default router; 