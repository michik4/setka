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
        let uploadDir;
        
        if (file.fieldname === 'audioFile') {
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
        
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueFileName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueFileName);
    }
});

// Фильтр файлов для multer
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedAudioMimeTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/ogg', 'audio/x-wav'];
    const allowedImageMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    
    console.log('[API Music] Получен файл:', file.originalname, file.mimetype);
    
    if (file.fieldname === 'audioFile' && allowedAudioMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else if (file.fieldname === 'coverImage' && allowedImageMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        console.log('[API Music] Недопустимый тип файла:', file.mimetype);
        cb(new Error('Разрешены только MP3, WAV, OGG файлы для аудио и JPG, PNG для обложек!'));
    }
};

// Инициализация multer
const upload = multer({ 
    storage, 
    fileFilter, 
    limits: { fileSize: 25 * 1024 * 1024 } // Ограничение размера файла в 25 МБ
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
router.post('/upload', upload.fields([
    { name: 'audioFile', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 }
]), async (req: any, res) => {
    try {
        console.log('[Music] Получен запрос на загрузку файла');
        
        if (!req.files || !req.files.audioFile) {
            console.error('[Music] Аудиофайл не найден в запросе');
            return res.status(400).json({ message: 'Аудиофайл не найден в запросе' });
        }
        
        const audioFile = req.files.audioFile[0];
        const coverFile = req.files.coverImage ? req.files.coverImage[0] : null;
        
        console.log('[Music] Загружен файл:', audioFile.originalname, audioFile.mimetype, audioFile.size);
        console.log('[Music] Файл сохранен как:', audioFile.filename);
        console.log('[Music] Полный путь к файлу:', audioFile.path);
        
        if (coverFile) {
            console.log('[Music] Загружена обложка:', coverFile.originalname, coverFile.mimetype, coverFile.size);
            console.log('[Music] Обложка сохранена как:', coverFile.filename);
            
            // Проверяем, что обложка была успешно сохранена
            const savedCoverPath = coverFile.path;
            if (!fs.existsSync(savedCoverPath)) {
                console.error('[Music] Ошибка: Обложка не была сохранена в:', savedCoverPath);
            } else {
                console.log('[Music] Обложка успешно сохранена в:', savedCoverPath);
            }
        }
        
        // Создаем объект с данными о треке
        const trackData = {
            title: req.body.title || 'Без названия',
            artist: req.body.artist || 'Неизвестный исполнитель',
            duration: req.body.duration || '0:00', // Используем длительность из запроса
            filename: audioFile.filename,
            filepath: `/api/media/music/${audioFile.filename}`, // Полный путь для API
            coverUrl: coverFile ? `/api/music/cover/${coverFile.filename}` : 'https://via.placeholder.com/300',
            userId: req.user?.id || 1, // Если пользователь не аутентифицирован, используем ID=1
            playCount: 0
        };
        
        console.log('[Music] Данные трека для сохранения:', trackData);
        
        // Проверка существования директории для сохранения
        const musicDir = path.dirname(audioFile.path);
        console.log('[Music] Проверка директории музыки:', musicDir);
        console.log('[Music] Директория существует:', fs.existsSync(musicDir));
        
        // Проверяем, что файл был успешно сохранен
        const savedFilePath = audioFile.path;
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

// Маршрут для получения аудиофайла
router.get('/file/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path.join(__dirname, '../../uploads/music', filename);
        
        console.log('[API Music] Запрос на получение файла:', filename);
        console.log('[API Music] Полный путь:', filePath);
        
        // Проверяем, существует ли файл
        if (!fs.existsSync(filePath)) {
            console.error('[API Music] Файл не найден:', filePath);
            return res.status(404).json({ message: 'Файл не найден' });
        }
        
        // Отправляем файл клиенту
        res.sendFile(filePath);
    } catch (error) {
        console.error('[API Music] Ошибка при получении файла:', error);
        res.status(500).json({ message: 'Ошибка сервера при получении файла' });
    }
});

// Маршрут для получения обложки
router.get('/cover/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path.join(__dirname, '../../uploads/covers', filename);
        
        console.log('[API Music] Запрос на получение обложки:', filename);
        console.log('[API Music] Полный путь:', filePath);
        
        // Проверяем, существует ли файл
        if (!fs.existsSync(filePath)) {
            console.error('[API Music] Обложка не найдена:', filePath);
            return res.status(404).json({ message: 'Обложка не найдена' });
        }
        
        // Отправляем файл клиенту
        res.sendFile(filePath);
    } catch (error) {
        console.error('[API Music] Ошибка при получении обложки:', error);
        res.status(500).json({ message: 'Ошибка сервера при получении обложки' });
    }
});

// Маршрут для обновления длительности трека
router.put('/duration/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { duration } = req.body;
        
        console.log(`[API Music] Запрос на обновление длительности трека ${id}:`, duration);
        
        // Проверяем валидность данных
        if (!duration) {
            return res.status(400).json({ message: 'Длительность трека не указана' });
        }
        
        // Находим трек в базе данных
        const track = await musicRepository.findOne({ where: { id: parseInt(id) } });
        
        if (!track) {
            return res.status(404).json({ message: 'Трек не найден' });
        }
        
        // Обновляем длительность трека
        track.duration = duration;
        await musicRepository.save(track);
        
        console.log(`[API Music] Длительность трека ${id} обновлена:`, duration);
        
        res.status(200).json({ message: 'Длительность трека успешно обновлена', track });
    } catch (error) {
        console.error('[API Music] Ошибка при обновлении длительности трека:', error);
        res.status(500).json({ message: 'Ошибка сервера при обновлении длительности трека' });
    }
});

export default router; 