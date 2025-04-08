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
exports.PhotoPlaceholder = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const canvas_1 = require("canvas");
class PhotoPlaceholder {
    static async createPlaceholder(extension) {
        // Создаем временную директорию, если её нет
        if (!fs.existsSync(this.TEMP_DIR)) {
            fs.mkdirSync(this.TEMP_DIR, { recursive: true });
        }
        // Генерируем уникальное имя файла
        const filename = `placeholder_${Date.now()}_${Math.random().toString(36).substring(7)}${extension}`;
        const filepath = path.join(this.TEMP_DIR, filename);
        // Создаем canvas
        const canvas = (0, canvas_1.createCanvas)(this.PLACEHOLDER_WIDTH, this.PLACEHOLDER_HEIGHT);
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
    static async cleanupTempFiles() {
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
        }
        catch (error) {
            console.error('[PhotoPlaceholder] Ошибка при очистке временных файлов:', error);
        }
    }
}
exports.PhotoPlaceholder = PhotoPlaceholder;
PhotoPlaceholder.TEMP_DIR = path.join(process.cwd(), 'uploads', 'temp');
PhotoPlaceholder.PLACEHOLDER_WIDTH = 800;
PhotoPlaceholder.PLACEHOLDER_HEIGHT = 600;
