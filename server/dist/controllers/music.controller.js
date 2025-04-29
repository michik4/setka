"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MusicController = void 0;
const db_connect_1 = require("../db/db_connect");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const music_entity_1 = require("../entities/music.entity");
const mm = __importStar(require("music-metadata"));
class MusicController {
    constructor() {
        this.musicRepository = db_connect_1.AppDataSource.getRepository(music_entity_1.MusicTrack);
    }
    // Получение аудиофайла по имени
    async getMusicFile(req, res) {
        try {
            const { filename } = req.params;
            console.log(`[MusicController] Запрос аудиофайла: ${filename}`);
            // Проверяем, существует ли файл
            const filePath = path.join(process.cwd(), 'uploads/music', filename);
            console.log(`[MusicController] Полный путь к файлу: ${filePath}`);
            if (!fs.existsSync(filePath)) {
                console.error(`[MusicController] Файл не найден: ${filePath}`);
                return res.status(404).json({ message: 'Аудиофайл не найден' });
            }
            // Определяем MIME-тип файла по расширению
            let contentType = 'audio/mpeg'; // По умолчанию MP3
            if (filename.endsWith('.mp3')) {
                contentType = 'audio/mpeg';
            }
            else if (filename.endsWith('.wav') || filename.endsWith('.wave')) {
                contentType = 'audio/wav';
            }
            else if (filename.endsWith('.ogg')) {
                contentType = 'audio/ogg';
            }
            // Устанавливаем заголовки для правильной обработки аудиофайла
            res.set({
                'Content-Type': contentType,
                'Content-Length': fs.statSync(filePath).size,
                'Accept-Ranges': 'bytes',
                'Access-Control-Allow-Origin': '*',
                'Cross-Origin-Resource-Policy': 'cross-origin'
            });
            console.log(`[MusicController] Отправка файла с Content-Type: ${contentType}`);
            // Отправляем файл
            return res.sendFile(filePath);
        }
        catch (error) {
            console.error('Ошибка при получении аудиофайла:', error);
            return res.status(500).json({ message: 'Ошибка при получении аудиофайла' });
        }
    }
    // Извлечение метаданных из аудиофайла
    async extractMetadata(filePath) {
        var _a, _b, _c, _d, _e, _f;
        try {
            console.log(`[MusicController] Извлечение метаданных из файла: ${filePath}`);
            const metadata = await mm.parseFile(filePath);
            console.log('[MusicController] Полученные метаданные:', {
                title: metadata.common.title,
                artist: metadata.common.artist,
                album: metadata.common.album,
                duration: metadata.format.duration,
                year: metadata.common.year,
                genre: (_a = metadata.common.genre) === null || _a === void 0 ? void 0 : _a[0],
                hasPicture: !!((_b = metadata.common.picture) === null || _b === void 0 ? void 0 : _b.length)
            });
            // Преобразуем длительность из секунд в формат mm:ss
            const durationSec = metadata.format.duration || 0;
            const minutes = Math.floor(durationSec / 60);
            const seconds = Math.floor(durationSec % 60);
            const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            // Получаем обложку, если она есть, и преобразуем Uint8Array в Buffer
            let pictureBuffer = undefined;
            if ((_d = (_c = metadata.common.picture) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.data) {
                pictureBuffer = Buffer.from(metadata.common.picture[0].data);
            }
            return {
                title: metadata.common.title || 'Неизвестный трек',
                artist: metadata.common.artist || 'Неизвестный исполнитель',
                duration: formattedDuration,
                year: (_e = metadata.common.year) === null || _e === void 0 ? void 0 : _e.toString(),
                genre: (_f = metadata.common.genre) === null || _f === void 0 ? void 0 : _f[0],
                albumTitle: metadata.common.album,
                picture: pictureBuffer
            };
        }
        catch (error) {
            console.error('[MusicController] Ошибка при извлечении метаданных:', error);
            return {
                title: 'Неизвестный трек',
                artist: 'Неизвестный исполнитель',
                duration: '0:00'
            };
        }
    }
    // Сохранение обложки из метаданных
    async saveCoverFromMetadata(pictureBuffer, originalFilename) {
        try {
            if (!pictureBuffer)
                return null;
            // Создаем уникальное имя файла на основе исходного имени и timestamp
            const timestamp = Date.now();
            const coverFileName = `cover_${path.parse(originalFilename).name}_${timestamp}.jpg`;
            const coverPath = path.join(process.cwd(), 'uploads/covers', coverFileName);
            // Проверяем наличие директории и создаем при необходимости
            const coverDir = path.dirname(coverPath);
            if (!fs.existsSync(coverDir)) {
                fs.mkdirSync(coverDir, { recursive: true });
            }
            // Сохраняем изображение
            fs.writeFileSync(coverPath, pictureBuffer);
            console.log(`[MusicController] Обложка из метаданных сохранена как: ${coverFileName}`);
            return coverFileName;
        }
        catch (error) {
            console.error('[MusicController] Ошибка при сохранении обложки из метаданных:', error);
            return null;
        }
    }
    // Загрузка трека с извлечением метаданных
    async uploadTrack(req, audioFile, coverFile) {
        var _a, _b;
        try {
            console.log('[MusicController] Обработка загрузки трека:', audioFile.originalname);
            console.log('[MusicController] Информация о файле:', {
                путь: audioFile.path,
                размер: audioFile.size,
                тип: audioFile.mimetype,
                поле: audioFile.fieldname
            });
            // Проверка доступности директории для записи
            const dir = path.dirname(audioFile.path);
            try {
                fs.accessSync(dir, fs.constants.W_OK);
                console.log(`[MusicController] Директория ${dir} доступна для записи`);
            }
            catch (accessError) {
                console.error(`[MusicController] Директория ${dir} НЕ доступна для записи:`, accessError);
            }
            // Проверка формата файла
            const acceptedFormats = ['.mp3', '.wav', '.ogg', '.m4a', '.flac'];
            const fileExt = path.extname(audioFile.originalname).toLowerCase();
            if (!acceptedFormats.includes(fileExt)) {
                throw new Error(`Неподдерживаемый формат файла: ${fileExt}. Поддерживаются только: ${acceptedFormats.join(', ')}`);
            }
            // Проверка максимального размера файла (25 МБ)
            const maxFileSize = 25 * 1024 * 2048;
            if (audioFile.size > maxFileSize) {
                throw new Error(`Файл слишком большой: ${Math.round(audioFile.size / (1024 * 2048))} МБ. Максимальный размер: 25 МБ`);
            }
            // Определяем, нужно ли извлекать метаданные
            const shouldExtractMetadata = req.body.extractMetadata === 'true';
            let metadata = {
                title: req.body.title || path.parse(audioFile.originalname).name || 'Неизвестный трек',
                artist: req.body.artist || 'Неизвестный исполнитель',
                duration: req.body.duration || '0:00',
                year: req.body.year,
                genre: req.body.genre,
                albumTitle: req.body.albumTitle
            };
            let coverUrl = coverFile
                ? `/api/music/cover/${coverFile.filename}`
                : null;
            // Если нужно извлечь метаданные
            if (shouldExtractMetadata) {
                try {
                    const extractedMetadata = await this.extractMetadata(audioFile.path);
                    // Используем извлеченные метаданные
                    metadata = {
                        ...metadata,
                        title: extractedMetadata.title || metadata.title,
                        artist: extractedMetadata.artist || metadata.artist,
                        duration: extractedMetadata.duration || metadata.duration,
                        year: extractedMetadata.year || metadata.year,
                        genre: extractedMetadata.genre || metadata.genre,
                        albumTitle: extractedMetadata.albumTitle || metadata.albumTitle
                    };
                    // Если в метаданных есть обложка и нет загруженной обложки
                    if (extractedMetadata.picture && !coverUrl) {
                        const savedCoverFileName = await this.saveCoverFromMetadata(extractedMetadata.picture, audioFile.originalname);
                        if (savedCoverFileName) {
                            coverUrl = `/api/music/cover/${savedCoverFileName}`;
                        }
                    }
                }
                catch (metadataError) {
                    console.error('[MusicController] Ошибка при извлечении метаданных:', metadataError);
                    // Продолжаем с исходными значениями из имени файла
                }
            }
            // Проверка на существование трека с таким же названием и исполнителем
            const existingTrack = await this.musicRepository.findOne({
                where: {
                    userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id,
                    title: metadata.title,
                    artist: metadata.artist
                }
            });
            if (existingTrack) {
                console.log(`[MusicController] Трек "${metadata.title}" от исполнителя "${metadata.artist}" уже существует в коллекции пользователя`);
                throw new Error(`Трек "${metadata.title}" от исполнителя "${metadata.artist}" уже существует в вашей коллекции`);
            }
            // Создаем объект с данными о треке
            const trackData = {
                title: metadata.title,
                artist: metadata.artist,
                duration: metadata.duration,
                filename: audioFile.filename,
                filepath: `/api/media/music/${audioFile.filename}`,
                coverUrl: coverUrl || '/api/music/cover/default.png',
                userId: ((_b = req.user) === null || _b === void 0 ? void 0 : _b.id) || 1, // Если пользователь не аутентифицирован, используем ID=1
                playCount: 0
            };
            console.log('[MusicController] Данные трека для сохранения:', trackData);
            // Проверяем существование файла перед сохранением в БД
            if (!fs.existsSync(audioFile.path)) {
                throw new Error(`Файл не был сохранен на диск: ${audioFile.path}`);
            }
            // Сохраняем информацию о треке в базу данных
            const track = this.musicRepository.create(trackData);
            await this.musicRepository.save(track);
            console.log('[MusicController] Трек успешно создан в БД с ID:', track.id);
            return track;
        }
        catch (error) {
            console.error('[MusicController] Ошибка при загрузке трека:', error);
            // Удаляем файл в случае ошибки, чтобы не засорять диск
            if (audioFile && audioFile.path && fs.existsSync(audioFile.path)) {
                try {
                    fs.unlinkSync(audioFile.path);
                    console.log(`[MusicController] Удален файл после ошибки: ${audioFile.path}`);
                }
                catch (unlinkError) {
                    console.error(`[MusicController] Ошибка при удалении файла после ошибки: ${unlinkError}`);
                }
            }
            throw error;
        }
    }
    /**
     * Добавляет существующий трек в библиотеку пользователя
     */
    async saveTrackToUserCollection(req, trackId) {
        var _a, _b, _c;
        try {
            console.log(`[MusicController] Запрос на добавление трека ID:${trackId} в библиотеку пользователя ID:${(_a = req.user) === null || _a === void 0 ? void 0 : _a.id}`);
            // Находим оригинальный трек
            const sourceTrack = await this.musicRepository.findOne({
                where: { id: trackId }
            });
            if (!sourceTrack) {
                console.error(`[MusicController] Не найден трек с ID:${trackId}`);
                return null;
            }
            // Проверяем, есть ли у пользователя такой же трек
            const existingTrack = await this.musicRepository.findOne({
                where: {
                    userId: (_b = req.user) === null || _b === void 0 ? void 0 : _b.id,
                    title: sourceTrack.title,
                    artist: sourceTrack.artist
                }
            });
            if (existingTrack) {
                console.log(`[MusicController] Трек "${sourceTrack.title}" от исполнителя "${sourceTrack.artist}" уже существует в коллекции пользователя`);
                return existingTrack;
            }
            // Создаем новую запись трека для пользователя
            const newTrack = this.musicRepository.create({
                title: sourceTrack.title,
                artist: sourceTrack.artist,
                duration: sourceTrack.duration,
                filename: sourceTrack.filename, // Используем тот же файл
                filepath: sourceTrack.filepath, // Используем тот же путь
                coverUrl: sourceTrack.coverUrl,
                userId: (_c = req.user) === null || _c === void 0 ? void 0 : _c.id,
                playCount: 0
            });
            await this.musicRepository.save(newTrack);
            console.log(`[MusicController] Трек успешно добавлен в библиотеку пользователя, ID:${newTrack.id}`);
            return newTrack;
        }
        catch (error) {
            console.error('[MusicController] Ошибка при добавлении трека в библиотеку:', error);
            return null;
        }
    }
}
exports.MusicController = MusicController;
exports.default = new MusicController();
