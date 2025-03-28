import * as fs from 'fs';
import * as path from 'path';
import { createCanvas } from 'canvas';

export class PhotoPlaceholder {
    private static readonly TEMP_DIR = path.join(process.cwd(), 'uploads', 'temp');
    private static readonly PLACEHOLDER_WIDTH = 800;
    private static readonly PLACEHOLDER_HEIGHT = 600;

    static async createPlaceholder(extension: string): Promise<string> {
        // Создаем временную директорию, если её нет
        if (!fs.existsSync(this.TEMP_DIR)) {
            fs.mkdirSync(this.TEMP_DIR, { recursive: true });
        }

        // Генерируем уникальное имя файла
        const filename = `placeholder_${Date.now()}_${Math.random().toString(36).substring(7)}${extension}`;
        const filepath = path.join(this.TEMP_DIR, filename);

        // Создаем canvas
        const canvas = createCanvas(this.PLACEHOLDER_WIDTH, this.PLACEHOLDER_HEIGHT);
        const ctx = canvas.getContext('2d');

        // Заполняем фон
        ctx.fillStyle = '#f0f2f5';
        ctx.fillRect(0, 0, this.PLACEHOLDER_WIDTH, this.PLACEHOLDER_HEIGHT);

        // Добавляем расширение файла
        ctx.fillStyle = '#447BBA';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(extension, this.PLACEHOLDER_WIDTH / 2, this.PLACEHOLDER_HEIGHT / 2 - 30);

        // Добавляем сообщение
        ctx.fillStyle = '#626D7A';
        ctx.font = '24px Arial';
        ctx.fillText('Фотография была удалена', this.PLACEHOLDER_WIDTH / 2, this.PLACEHOLDER_HEIGHT / 2 + 30);

        // Сохраняем изображение
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(filepath, buffer);

        return filename;
    }

    static async cleanupTempFiles(): Promise<void> {
        if (!fs.existsSync(this.TEMP_DIR)) {
            return;
        }

        try {
            const files = fs.readdirSync(this.TEMP_DIR);
            console.log(`[PhotoPlaceholder] Найдено ${files.length} временных файлов для удаления`);
            
            for (const file of files) {
                if (file.startsWith('placeholder_')) {
                    const filepath = path.join(this.TEMP_DIR, file);
                    fs.unlinkSync(filepath);
                    console.log(`[PhotoPlaceholder] Удален временный файл: ${file}`);
                }
            }
            
            console.log('[PhotoPlaceholder] Очистка временных файлов завершена');
        } catch (error) {
            console.error('[PhotoPlaceholder] Ошибка при очистке временных файлов:', error);
        }
    }
} 