import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';

// Создаем директорию для загрузки файлов, если она не существует
const createUploadDir = () => {
    const uploadDir = path.resolve(process.cwd(), 'uploads/photos');
    if (!fs.existsSync(uploadDir)) {
        try {
            fs.mkdirSync(uploadDir, { recursive: true });
            // Устанавливаем права на запись
            fs.chmodSync(uploadDir, 0o755);
        } catch (err) {
            console.error('Ошибка при создании директории для загрузки:', err);
            throw new Error('Не удалось создать директорию для загрузки файлов');
        }
    }
    return uploadDir;
};

// Конфигурация multer для загрузки файлов
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        try {
            const uploadDir = createUploadDir();
            cb(null, uploadDir);
        } catch (err) {
            cb(err as Error, '');
        }
    },
    filename: (req, file, cb) => {
        try {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const ext = path.extname(file.originalname);
            if (!ext) {
                cb(new Error('Файл должен иметь расширение'), '');
                return;
            }
            cb(null, uniqueSuffix + ext);
        } catch (err) {
            cb(err as Error, '');
        }
    }
});

export const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/gif'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Недопустимый тип файла. Разрешены только JPEG, PNG и GIF'));
        }
    }
}); 