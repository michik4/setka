import { Request, Response } from 'express';
import { AppDataSource } from '../db/db_connect';
import * as path from 'path';
import * as fs from 'fs';
import { MusicTrack } from '../entities/music.entity';

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
}

export default new MusicController(); 