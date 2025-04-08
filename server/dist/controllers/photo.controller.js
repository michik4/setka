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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhotoController = exports.upload = void 0;
const db_connect_1 = require("../db/db_connect");
const photo_entity_1 = require("../entities/photo.entity");
const post_entity_1 = require("../entities/post.entity");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const multer_1 = __importDefault(require("multer"));
const placeholder_1 = require("../utils/placeholder");
// Конфигурация multer для загрузки файлов
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/photos';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
exports.upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/gif'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only JPEG, PNG and GIF are allowed.'));
        }
    }
});
class PhotoController {
    constructor() {
        this.photoRepository = db_connect_1.AppDataSource.getRepository(photo_entity_1.Photo);
        this.postRepository = db_connect_1.AppDataSource.getRepository(post_entity_1.Post);
    }
    async uploadPhoto(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ message: 'No file uploaded' });
            }
            const { userId, description, albumId, skipDefaultAlbum } = req.body;
            const photo = this.photoRepository.create({
                filename: req.file.filename,
                originalName: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size,
                path: req.file.filename,
                extension: path.extname(req.file.originalname),
                userId: parseInt(userId),
                description
            });
            await this.photoRepository.save(photo);
            // Если указан конкретный альбом, добавляем фото в него
            if (albumId) {
                try {
                    const album = await db_connect_1.AppDataSource.getRepository('Album').findOne({
                        where: { id: parseInt(albumId) },
                        relations: ['photos']
                    });
                    if (album) {
                        album.photos.push(photo);
                        album.photosCount = album.photos.length;
                        await db_connect_1.AppDataSource.getRepository('Album').save(album);
                    }
                    else {
                        console.error(`Альбом с ID ${albumId} не найден при загрузке фото`);
                    }
                }
                catch (error) {
                    console.error('Ошибка при добавлении фото в указанный альбом:', error);
                }
            }
            // Если нет флага skipDefaultAlbum, добавляем фото в альбом "Загруженное"
            if (skipDefaultAlbum !== 'true') {
                try {
                    // Ищем или создаем альбом "Загруженное" для пользователя
                    let uploadedAlbum = await db_connect_1.AppDataSource.getRepository('Album').findOne({
                        where: {
                            userId: parseInt(userId),
                            title: 'Загруженное'
                        },
                        relations: ['photos']
                    });
                    if (!uploadedAlbum) {
                        uploadedAlbum = db_connect_1.AppDataSource.getRepository('Album').create({
                            title: 'Загруженное',
                            description: 'Автоматически созданный альбом для загруженных фотографий',
                            userId: parseInt(userId),
                            isPrivate: false,
                            photos: [],
                            photosCount: 0
                        });
                        await db_connect_1.AppDataSource.getRepository('Album').save(uploadedAlbum);
                    }
                    uploadedAlbum.photos.push(photo);
                    uploadedAlbum.photosCount = uploadedAlbum.photos.length;
                    await db_connect_1.AppDataSource.getRepository('Album').save(uploadedAlbum);
                }
                catch (error) {
                    console.error('Ошибка при добавлении фото в альбом "Загруженное":', error);
                }
            }
            return res.status(201).json(photo);
        }
        catch (error) {
            console.error('Error uploading photo:', error);
            return res.status(500).json({ message: 'Error uploading photo' });
        }
    }
    async getUserPhotos(req, res) {
        try {
            const { userId } = req.params;
            const photos = await this.photoRepository.find({
                where: { userId: parseInt(userId) },
                order: { createdAt: 'DESC' }
            });
            return res.json(photos);
        }
        catch (error) {
            console.error('Error getting user photos:', error);
            return res.status(500).json({ message: 'Error getting user photos' });
        }
    }
    async getPhotoById(req, res) {
        try {
            const { id } = req.params;
            const photo = await this.photoRepository.findOne({
                where: { id: parseInt(id) },
                relations: ['user']
            });
            if (!photo) {
                return res.status(404).json({ message: 'Photo not found' });
            }
            // Если запрашивается файл изображения
            if (req.query.file === 'true') {
                // Если фото помечено как удаленное, создаем заглушку
                if (photo.isDeleted) {
                    console.log(`[PhotoController] Фото ${id} помечено как удаленное, создаем заглушку`);
                    const placeholderPath = await placeholder_1.PhotoPlaceholder.createPlaceholder(photo.extension);
                    return res.sendFile(path.join(process.cwd(), 'uploads/temp', placeholderPath));
                }
                const filePath = path.join(process.cwd(), 'uploads/photos', photo.path);
                if (!fs.existsSync(filePath)) {
                    console.log(`[PhotoController] Файл ${filePath} не найден, создаем заглушку`);
                    const placeholderPath = await placeholder_1.PhotoPlaceholder.createPlaceholder(photo.extension);
                    return res.sendFile(path.join(process.cwd(), 'uploads/temp', placeholderPath));
                }
                return res.sendFile(filePath);
            }
            return res.json(photo);
        }
        catch (error) {
            console.error('Error getting photo:', error);
            return res.status(500).json({ message: 'Error getting photo' });
        }
    }
    async deletePhoto(req, res) {
        try {
            const { id } = req.params;
            const photo = await this.photoRepository.findOne({
                where: { id: parseInt(id) }
            });
            if (!photo) {
                return res.status(404).json({ message: 'Photo not found' });
            }
            // Удаляем файл
            const filePath = path.join(process.cwd(), 'uploads/photos', photo.path);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            // Помечаем фотографию как удаленную
            photo.isDeleted = true;
            await this.photoRepository.save(photo);
            return res.status(200).json({ message: 'Photo deleted successfully' });
        }
        catch (error) {
            console.error('Error deleting photo:', error);
            return res.status(500).json({ message: 'Error deleting photo' });
        }
    }
    async getAllPhotos(req, res) {
        try {
            const photos = await this.photoRepository.find({
                relations: ['user'],
                order: { createdAt: 'DESC' }
            });
            res.json(photos);
        }
        catch (error) {
            console.error('Error getting all photos:', error);
            res.status(500).json({ message: 'Ошибка при получении фотографий' });
        }
    }
    async getPhotoFile(req, res) {
        try {
            const { filename } = req.params;
            // Находим фото по имени файла
            const photo = await this.photoRepository.findOne({
                where: { path: filename }
            });
            if (!photo) {
                console.error('Фото не найдено в базе данных:', filename);
                return res.status(404).json({ message: 'Фото не найдено' });
            }
            // Если фото помечено как удаленное, создаем заглушку
            if (photo.isDeleted) {
                console.log(`[PhotoController] Фото ${filename} помечено как удаленное, создаем заглушку`);
                const placeholderPath = await placeholder_1.PhotoPlaceholder.createPlaceholder(photo.extension);
                return res.sendFile(path.join(process.cwd(), 'uploads/temp', placeholderPath));
            }
            const filePath = path.join(process.cwd(), 'uploads/photos', filename);
            console.log('Запрошен файл:', filePath);
            if (!fs.existsSync(filePath)) {
                console.error('Файл не найден:', filePath);
                return res.status(404).json({ message: 'Файл изображения не найден' });
            }
            return res.sendFile(filePath);
        }
        catch (error) {
            console.error('Ошибка при получении файла изображения:', error);
            return res.status(500).json({ message: 'Ошибка при получении файла изображения' });
        }
    }
    // Новый метод для отвязки фотографии от поста
    async unlinkPhotoFromPost(req, res) {
        try {
            const { photoId, postId } = req.params;
            const post = await this.postRepository.findOne({
                where: { id: parseInt(postId) },
                relations: ['photos']
            });
            if (!post) {
                return res.status(404).json({ message: 'Post not found' });
            }
            // Отвязываем фотографию от поста
            post.photos = post.photos.filter(photo => photo.id !== parseInt(photoId));
            await this.postRepository.save(post);
            return res.status(200).json({ message: 'Photo unlinked from post successfully' });
        }
        catch (error) {
            console.error('Error unlinking photo from post:', error);
            return res.status(500).json({ message: 'Error unlinking photo from post' });
        }
    }
}
exports.PhotoController = PhotoController;
