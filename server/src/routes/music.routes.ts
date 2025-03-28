import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { AppDataSource } from '../db/db_connect';
import { MusicTrack } from '../entities/music.entity';
import { User } from '../entities/user.entity';
import { authenticateSession } from '../middleware/auth.middleware';
import musicController from '../controllers/music.controller';

const router = Router();
const musicRepository = AppDataSource.getRepository(MusicTrack);
const userRepository = AppDataSource.getRepository(User);

// Настройка хранилища для multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/music');
        
        // Создаем директорию, если она не существует
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueFileName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueFileName);
    }
});

// Фильтр файлов для multer
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimeTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/ogg', 'audio/x-wav'];
    
    console.log('[API Music] Получен файл:', file.originalname, file.mimetype);
    
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        console.log('[API Music] Недопустимый тип файла:', file.mimetype);
        cb(new Error('Разрешены только MP3, WAV и OGG файлы!'));
    }
};

const upload = multer({ 
    storage, 
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // Ограничение размера файла: 10MB
    }
});

// Тестовый маршрут для проверки API
router.get('/test', (req, res) => {
    console.log('[API Music] GET /test - Тестовый запрос');
    
    // Отправляем простой JSON-ответ
    res.setHeader('Content-Type', 'application/json');
    res.json({ 
        message: 'API музыки работает корректно',
        timestamp: new Date().toISOString(),
        headers: req.headers,
        cookies: req.cookies
    });
});

// Получить все треки пользователя
router.get('/', authenticateSession, async (req: any, res) => {
    console.log('[API Music] GET / - Запрос на получение всех треков пользователя');
    console.log('[API Music] Пользователь:', req.user?.id);
    
    try {
        if (!req.user || !req.user.id) {
            console.error('[API Music] Пользователь не аутентифицирован или ID отсутствует');
            return res.status(401).json({ message: 'Пользователь не аутентифицирован' });
        }
        
        const userId = req.user.id;
        
        console.log('[API Music] Поиск треков для пользователя:', userId);
        const tracks = await musicRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' }
        });
        
        console.log(`[API Music] Найдено ${tracks.length} треков`);
        // Добавляем заголовок Content-Type для явного указания формата ответа
        res.setHeader('Content-Type', 'application/json');
        return res.json(tracks);
    } catch (error) {
        console.error('[API Music] Ошибка при получении треков:', error);
        return res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Обработчик загрузки треков
router.post('/upload', upload.single('audioFile'), async (req: any, res) => {
    try {
        console.log('[Music] Получен запрос на загрузку файла');
        
        if (!req.file) {
            console.error('[Music] Файл не найден в запросе');
            return res.status(400).json({ message: 'Файл не найден в запросе' });
        }
        
        console.log('[Music] Загружен файл:', req.file.originalname, req.file.mimetype, req.file.size);
        console.log('[Music] Файл сохранен как:', req.file.filename);
        console.log('[Music] Полный путь к файлу:', req.file.path);
        
        // Создаем объект с данными о треке
        const trackData = {
            title: req.body.title || 'Без названия',
            artist: req.body.artist || 'Неизвестный исполнитель',
            duration: '0:00', // Временно, нужно будет добавить извлечение длительности
            filename: req.file.filename,
            filepath: `/api/media/music/${req.file.filename}`, // Полный путь для API
            coverUrl: 'https://via.placeholder.com/300', // Заглушка для обложки
            userId: req.user?.id || 1, // Если пользователь не аутентифицирован, используем ID=1
            playCount: 0
        };
        
        console.log('[Music] Данные трека для сохранения:', trackData);
        
        // Проверка существования директории для сохранения
        const musicDir = path.dirname(req.file.path);
        console.log('[Music] Проверка директории музыки:', musicDir);
        console.log('[Music] Директория существует:', fs.existsSync(musicDir));
        
        // Проверяем, что файл был успешно сохранен
        const savedFilePath = req.file.path;
        if (!fs.existsSync(savedFilePath)) {
            console.error('[Music] Ошибка: Файл не был сохранен в:', savedFilePath);
            return res.status(500).json({ message: 'Ошибка при сохранении файла' });
        }
        
        console.log('[Music] Файл успешно сохранен в:', savedFilePath);
        console.log('[Music] Размер сохраненного файла:', fs.statSync(savedFilePath).size, 'байт');
        
        // Сохраняем информацию о треке в базу данных
        const track = await musicRepository.create(trackData);
        await musicRepository.save(track);
        console.log('[Music] Трек успешно создан в БД с ID:', track.id);
        
        // Возвращаем успешный ответ
        return res.status(201).json({
            ...track,
            message: 'Трек успешно загружен'
        });
    } catch (error) {
        console.error('[Music] Ошибка при загрузке трека:', error);
        return res.status(500).json({ message: 'Не удалось загрузить трек' });
    }
});

// Получить один трек по ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const track = await musicRepository.findOne({
            where: { id: parseInt(id) }
        });
        
        if (!track) {
            return res.status(404).json({ message: 'Трек не найден' });
        }
        
        res.json(track);
    } catch (error) {
        console.error('Ошибка при получении трека:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Удалить трек
router.delete('/:id', authenticateSession, async (req: any, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        
        const track = await musicRepository.findOne({
            where: { id: parseInt(id), userId }
        });
        
        if (!track) {
            return res.status(404).json({ message: 'Трек не найден' });
        }
        
        // Удаляем файл с диска
        const filePath = path.join(__dirname, '../../uploads/music', track.filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        
        await musicRepository.remove(track);
        
        res.json({ message: 'Трек успешно удален' });
    } catch (error) {
        console.error('Ошибка при удалении трека:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Увеличить счетчик прослушиваний
router.post('/:id/play', async (req, res) => {
    try {
        const { id } = req.params;
        
        const track = await musicRepository.findOne({
            where: { id: parseInt(id) }
        });
        
        if (!track) {
            return res.status(404).json({ message: 'Трек не найден' });
        }
        
        track.playCount += 1;
        await musicRepository.save(track);
        
        res.json({ message: 'Счетчик прослушиваний увеличен', playCount: track.playCount });
    } catch (error) {
        console.error('Ошибка при обновлении счетчика прослушиваний:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Получение аудиофайла по имени
router.get('/file/:filename', musicController.getMusicFile);

export default router; 