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
    console.log('[API Music] GET / - Запрос на получение треков пользователя');
    console.log('[API Music] Пользователь:', req.user?.id);
    
    try {
        if (!req.user || !req.user.id) {
            console.error('[API Music] Пользователь не аутентифицирован или ID отсутствует');
            return res.status(401).json({ message: 'Пользователь не аутентифицирован' });
        }
        
        const userId = req.user.id;
        
        // Параметры пагинации
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;
        
        console.log(`[API Music] Пагинация: страница ${page}, лимит ${limit}, пропустить ${skip}`);
        
        // Получаем общее количество треков пользователя
        const totalTracks = await musicRepository.count({
            where: { userId }
        });
        
        // Получаем треки с пагинацией
        const tracks = await musicRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
            skip,
            take: limit
        });
        
        console.log(`[API Music] Найдено ${tracks.length} треков на странице ${page} из ${Math.ceil(totalTracks / limit)} страниц`);
        
        // Добавляем заголовок Content-Type для явного указания формата ответа
        res.setHeader('Content-Type', 'application/json');
        return res.json({
            tracks,
            pagination: {
                total: totalTracks,
                page,
                limit,
                pages: Math.ceil(totalTracks / limit),
                hasMore: page < Math.ceil(totalTracks / limit)
            }
        });
    } catch (error) {
        console.error('[API Music] Ошибка при получении треков:', error);
        return res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Обработчик загрузки треков
router.post('/upload', authenticateSession, upload.fields([
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
        
        // Используем метод контроллера для обработки загрузки
        const track = await musicController.uploadTrack(req, audioFile, coverFile);
        
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

// Новый маршрут для множественной загрузки файлов
router.post('/upload/multiple', authenticateSession, multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 25 * 1024 * 1024 }
}).fields([
    { name: 'audioFile', maxCount: 100 }, // Увеличиваем до 100 файлов одновременно
    { name: 'coverImage', maxCount: 1 }
]), async (req: any, res) => {
    try {
        console.log('[Music] Получен запрос на множественную загрузку файлов');
        
        if (!req.files || !req.files.audioFile || req.files.audioFile.length === 0) {
            console.error('[Music] Аудиофайлы не найдены в запросе');
            return res.status(400).json({ message: 'Аудиофайлы не найдены в запросе' });
        }
        
        const audioFiles = req.files.audioFile;
        const coverFile = req.files.coverImage ? req.files.coverImage[0] : null;
        
        console.log(`[Music] Загружено ${audioFiles.length} файлов`);
        
        // Проверяем, не превышает ли размер всех файлов вместе максимально допустимый
        const totalSize = audioFiles.reduce((sum: number, file: Express.Multer.File) => sum + file.size, 0);
        const maxTotalSize = 1000 * 1024 * 1024; // 1 ГБ максимум для всех файлов вместе
        
        if (totalSize > maxTotalSize) {
            return res.status(413).json({
                message: `Общий размер файлов превышает максимально допустимый (${Math.round(maxTotalSize / (1024 * 1024))} МБ)`
            });
        }
        
        // Обрабатываем каждый аудиофайл
        const results = [];
        const errors = [];
        
        // Обрабатываем файлы последовательно для экономии памяти
        for (const audioFile of audioFiles) {
            try {
                console.log(`[Music] Обработка файла: ${audioFile.originalname}`);
                
                // Проверка наличия дубликата по имени файла
                const existingTrack = await musicRepository.findOne({
                    where: { 
                        userId: req.user.id,
                        title: path.parse(audioFile.originalname).name // Используем имя файла для проверки
                    }
                });
                
                if (existingTrack) {
                    console.log(`[Music] Трек с похожим названием уже существует: ${existingTrack.title}`);
                    errors.push({
                        success: false,
                        originalName: audioFile.originalname,
                        error: 'Трек с таким названием уже существует в вашей коллекции'
                    });
                    continue; // Пропускаем этот файл и переходим к следующему
                }
                
                // Используем метод контроллера для обработки загрузки
                const track = await musicController.uploadTrack(req, audioFile, coverFile);
                
                results.push({
                    success: true,
                    track,
                    originalName: audioFile.originalname
                });
            } catch (error: any) {
                console.error(`[Music] Ошибка при обработке файла ${audioFile.originalname}:`, error);
                
                errors.push({
                    success: false,
                    originalName: audioFile.originalname,
                    error: error.message || 'Неизвестная ошибка'
                });
            }
        }
        
        // Возвращаем результаты загрузки
        return res.status(201).json({
            message: `Загружено ${results.length} файлов, ${errors.length} ошибок`,
            results,
            errors,
            totalUploaded: results.length,
            totalFailed: errors.length
        });
    } catch (error) {
        console.error('[Music] Общая ошибка при множественной загрузке:', error);
        return res.status(500).json({ message: 'Не удалось загрузить файлы' });
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

// Удалить все треки пользователя
router.delete('/user/all', authenticateSession, async (req: any, res) => {
    try {
        const userId = req.user.id;
        
        console.log(`[API Music] Запрос на удаление всех треков пользователя ID=${userId}`);
        
        // Находим все треки пользователя
        const tracks = await musicRepository.find({
            where: { userId }
        });
        
        const trackCount = tracks.length;
        console.log(`[API Music] Найдено ${trackCount} треков для удаления`);
        
        if (trackCount === 0) {
            return res.json({ message: 'У вас нет треков для удаления', deletedCount: 0 });
        }
        
        // Удаляем файлы с диска
        let successCount = 0;
        let errorCount = 0;
        
        for (const track of tracks) {
            try {
                const filePath = path.join(__dirname, '../../uploads/music', track.filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    successCount++;
                }
            } catch (fileError) {
                console.error(`[API Music] Ошибка при удалении файла трека ${track.id}:`, fileError);
                errorCount++;
            }
        }
        
        // Удаляем записи из БД
        await musicRepository.remove(tracks);
        
        console.log(`[API Music] Удалено ${trackCount} треков пользователя ${userId}`);
        
        return res.json({
            message: `Успешно удалено ${trackCount} треков`,
            deletedCount: trackCount,
            fileSuccess: successCount,
            fileErrors: errorCount
        });
    } catch (error) {
        console.error('[API Music] Ошибка при удалении всех треков:', error);
        return res.status(500).json({ message: 'Ошибка при удалении треков' });
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