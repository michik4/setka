import * as fs from 'fs';
import * as path from 'path';
import { createCanvas } from 'canvas';

export class PhotoPlaceholder {
    private static readonly TEMP_DIR = path.join(process.cwd(), 'uploads', 'temp');
    private static readonly DEFAULT_WIDTH = 800;
    private static readonly DEFAULT_HEIGHT = 600;

    static async createPlaceholder(extension: string, width?: number, height?: number): Promise<string> {
        // Создаем временную директорию, если её нет
        if (!fs.existsSync(this.TEMP_DIR)) {
            fs.mkdirSync(this.TEMP_DIR, { recursive: true });
        }

        // Используем переданные размеры или дефолтные
        const placeholderWidth = width || this.DEFAULT_WIDTH;
        const placeholderHeight = height || this.DEFAULT_HEIGHT;

        // Генерируем уникальное имя файла с размерами
        const filename = `placeholder_${Date.now()}_${Math.random().toString(36).substring(7)}_${placeholderWidth}x${placeholderHeight}${extension}`;
        const filepath = path.join(this.TEMP_DIR, filename);

        // Создаем canvas
        const canvas = createCanvas(placeholderWidth, placeholderHeight);
        const ctx = canvas.getContext('2d');

        // Заполняем фон
        ctx.fillStyle = '#f0f2f5';
        ctx.fillRect(0, 0, placeholderWidth, placeholderHeight);

        // Добавляем расширение файла
        ctx.fillStyle = '#447BBA';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(extension, placeholderWidth / 2, placeholderHeight / 2 - 30);

        // Добавляем сообщение
        ctx.fillStyle = '#626D7A';
        ctx.font = '24px Arial';
        ctx.fillText('Фотография была удалена', placeholderWidth / 2, placeholderHeight / 2 + 30);

        // Сохраняем изображение
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(filepath, buffer);

        return filename;
    }

    static async cleanupTempFiles(): Promise<void> {
        if (!fs.existsSync(this.TEMP_DIR)) {
            console.log(`[PhotoPlaceholder] Директория ${this.TEMP_DIR} не существует, создаем`);
            try {
                fs.mkdirSync(this.TEMP_DIR, { recursive: true });
            } catch (error) {
                console.error(`[PhotoPlaceholder] Не удалось создать директорию ${this.TEMP_DIR}:`, error);
                return;
            }
            return;
        }

        try {
            const files = fs.readdirSync(this.TEMP_DIR);
            console.log(`[PhotoPlaceholder] Найдено ${files.length} временных файлов для удаления`);
            
            let deletedCount = 0;
            let errorCount = 0;
            
            for (const file of files) {
                if (file.startsWith('placeholder_')) {
                    const filepath = path.join(this.TEMP_DIR, file);
                    
                    try {
                        // Проверяем, что файл существует и доступен для чтения
                        try {
                            fs.accessSync(filepath, fs.constants.F_OK | fs.constants.W_OK);
                        } catch (accessError) {
                            console.warn(`[PhotoPlaceholder] Файл ${file} недоступен для удаления:`, accessError);
                            continue;
                        }
                        
                        // Проверяем, когда файл был создан
                        const stats = fs.statSync(filepath);
                        const fileAge = Date.now() - stats.birthtimeMs;
                        
                        // Если файл создан более 1 часа назад или начинается с 'placeholder_'
                        if (fileAge > 3600000 || file.startsWith('placeholder_')) {
                            fs.unlinkSync(filepath);
                            deletedCount++;
                            console.log(`[PhotoPlaceholder] Удален временный файл: ${file}`);
                        }
                    } catch (removeError) {
                        errorCount++;
                        console.error(`[PhotoPlaceholder] Ошибка при удалении файла ${file}:`, removeError);
                    }
                }
            }
            
            console.log(`[PhotoPlaceholder] Очистка временных файлов завершена: удалено ${deletedCount}, ошибок: ${errorCount}`);
        } catch (error) {
            console.error('[PhotoPlaceholder] Ошибка при очистке временных файлов:', error);
        }
    }
} 