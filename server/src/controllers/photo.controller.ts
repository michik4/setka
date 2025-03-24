import { Request, Response } from 'express';
import { AppDataSource } from '../db/db_connect';
import { Photo } from '../entities/photo.entity';
import * as path from 'path';
import * as fs from 'fs';
import multer from 'multer';

// Конфигурация multer для загрузки файлов
const storage = multer.diskStorage({
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
            cb(new Error('Invalid file type. Only JPEG, PNG and GIF are allowed.'));
        }
    }
});

export class PhotoController {
    private photoRepository = AppDataSource.getRepository(Photo);

    async uploadPhoto(req: Request, res: Response) {
        try {
            if (!req.file) {
                return res.status(400).json({ message: 'No file uploaded' });
            }

            const { userId, description } = req.body;
            
            const photo = this.photoRepository.create({
                filename: req.file.filename,
                originalName: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size,
                path: req.file.path,
                userId: parseInt(userId),
                description
            });

            await this.photoRepository.save(photo);

            return res.status(201).json(photo);
        } catch (error) {
            console.error('Error uploading photo:', error);
            return res.status(500).json({ message: 'Error uploading photo' });
        }
    }

    async getUserPhotos(req: Request, res: Response) {
        try {
            const { userId } = req.params;
            const photos = await this.photoRepository.find({
                where: { userId: parseInt(userId) },
                order: { createdAt: 'DESC' }
            });

            return res.json(photos);
        } catch (error) {
            console.error('Error getting user photos:', error);
            return res.status(500).json({ message: 'Error getting user photos' });
        }
    }

    async getPhotoById(req: Request, res: Response) {
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
                const filePath = path.join(process.cwd(), photo.path);
                if (!fs.existsSync(filePath)) {
                    return res.status(404).json({ message: 'Image file not found' });
                }
                return res.sendFile(filePath);
            }

            return res.json(photo);
        } catch (error) {
            console.error('Error getting photo:', error);
            return res.status(500).json({ message: 'Error getting photo' });
        }
    }

    async deletePhoto(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const photo = await this.photoRepository.findOne({ 
                where: { id: parseInt(id) } 
            });

            if (!photo) {
                return res.status(404).json({ message: 'Photo not found' });
            }

            // Удаляем файл
            if (fs.existsSync(photo.path)) {
                fs.unlinkSync(photo.path);
            }

            // Удаляем запись из базы данных
            await this.photoRepository.delete(photo.id);

            return res.status(200).json({ message: 'Photo deleted successfully' });
        } catch (error) {
            console.error('Error deleting photo:', error);
            return res.status(500).json({ message: 'Error deleting photo' });
        }
    }

    async getAllPhotos(req: Request, res: Response) {
        try {
            const photos = await this.photoRepository.find({
                relations: ['user'],
                order: { createdAt: 'DESC' }
            });
            
            res.json(photos);
        } catch (error) {
            console.error('Error getting all photos:', error);
            res.status(500).json({ message: 'Ошибка при получении фотографий' });
        }
    }
} 