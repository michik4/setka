import { Request, Response } from 'express';
import { AppDataSource } from '../db/db_connect';
import * as path from 'path';
import * as fs from 'fs';
import { MusicTrack } from '../entities/music.entity';
import * as mm from 'music-metadata';
import { IAudioMetadata } from 'music-metadata';

export class MusicController {
    private musicRepository = AppDataSource.getRepository(MusicTrack);

    // Получение аудиофайла по имени
    async getMusicFile(req: Request, res: Response) {
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
            } else if (filename.endsWith('.wav') || filename.endsWith('.wave')) {
                contentType = 'audio/wav';
            } else if (filename.endsWith('.ogg')) {
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
        } catch (error) {
            console.error('Ошибка при получении аудиофайла:', error);
            return res.status(500).json({ message: 'Ошибка при получении аудиофайла' });
        }
    }

    // Извлечение метаданных из аудиофайла
    async extractMetadata(filePath: string): Promise<{
        title: string;
        artist: string;
        duration: string;
        year?: string;
        genre?: string;
        albumTitle?: string;
        picture?: Buffer;
    }> {
        try {
            console.log(`[MusicController] Извлечение метаданных из файла: ${filePath}`);
            
            const metadata: IAudioMetadata = await mm.parseFile(filePath);
            
            console.log('[MusicController] Полученные метаданные:', {
                title: metadata.common.title,
                artist: metadata.common.artist,
                album: metadata.common.album,
                duration: metadata.format.duration,
                year: metadata.common.year,
                genre: metadata.common.genre?.[0],
                hasPicture: !!metadata.common.picture?.length
            });
            
            // Преобразуем длительность из секунд в формат mm:ss
            const durationSec = metadata.format.duration || 0;
            const minutes = Math.floor(durationSec / 60);
            const seconds = Math.floor(durationSec % 60);
            const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            // Получаем обложку, если она есть, и преобразуем Uint8Array в Buffer
            let pictureBuffer: Buffer | undefined = undefined;
            if (metadata.common.picture?.[0]?.data) {
                pictureBuffer = Buffer.from(metadata.common.picture[0].data);
            }
            
            return {
                title: metadata.common.title || 'Неизвестный трек',
                artist: metadata.common.artist || 'Неизвестный исполнитель',
                duration: formattedDuration,
                year: metadata.common.year?.toString(),
                genre: metadata.common.genre?.[0],
                albumTitle: metadata.common.album,
                picture: pictureBuffer
            };
        } catch (error) {
            console.error('[MusicController] Ошибка при извлечении метаданных:', error);
            return {
                title: 'Неизвестный трек',
                artist: 'Неизвестный исполнитель',
                duration: '0:00'
            };
        }
    }

    // Сохранение обложки из метаданных
    async saveCoverFromMetadata(pictureBuffer: Buffer, originalFilename: string): Promise<string | null> {
        try {
            if (!pictureBuffer) return null;
            
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
        } catch (error) {
            console.error('[MusicController] Ошибка при сохранении обложки из метаданных:', error);
            return null;
        }
    }

    // Загрузка трека с извлечением метаданных
    async uploadTrack(req: any, audioFile: Express.Multer.File, coverFile: Express.Multer.File | null): Promise<MusicTrack> {
        try {
            console.log('[MusicController] Обработка загрузки трека:', audioFile.originalname);
            
            // Проверка формата файла
            const acceptedFormats = ['.mp3', '.wav', '.ogg', '.m4a', '.flac'];
            const fileExt = path.extname(audioFile.originalname).toLowerCase();
            
            if (!acceptedFormats.includes(fileExt)) {
                throw new Error(`Неподдерживаемый формат файла: ${fileExt}. Поддерживаются только: ${acceptedFormats.join(', ')}`);
            }
            
            // Проверка максимального размера файла (25 МБ)
            const maxFileSize = 25 * 1024 * 1024;
            if (audioFile.size > maxFileSize) {
                throw new Error(`Файл слишком большой: ${Math.round(audioFile.size / (1024 * 1024))} МБ. Максимальный размер: 25 МБ`);
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
                        const savedCoverFileName = await this.saveCoverFromMetadata(
                            extractedMetadata.picture,
                            audioFile.originalname
                        );
                        
                        if (savedCoverFileName) {
                            coverUrl = `/api/music/cover/${savedCoverFileName}`;
                        }
                    }
                } catch (metadataError) {
                    console.error('[MusicController] Ошибка при извлечении метаданных:', metadataError);
                    // Продолжаем с исходными значениями из имени файла
                }
            }
            
            // Проверка на существование трека с таким же названием и исполнителем
            const existingTrack = await this.musicRepository.findOne({
                where: {
                    userId: req.user?.id,
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
                userId: req.user?.id || 1, // Если пользователь не аутентифицирован, используем ID=1
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
        } catch (error) {
            console.error('[MusicController] Ошибка при загрузке трека:', error);
            
            // Удаляем файл в случае ошибки, чтобы не засорять диск
            if (audioFile && audioFile.path && fs.existsSync(audioFile.path)) {
                try {
                    fs.unlinkSync(audioFile.path);
                    console.log(`[MusicController] Удален файл после ошибки: ${audioFile.path}`);
                } catch (unlinkError) {
                    console.error(`[MusicController] Ошибка при удалении файла после ошибки: ${unlinkError}`);
                }
            }
            
            throw error;
        }
    }
}

export default new MusicController(); 