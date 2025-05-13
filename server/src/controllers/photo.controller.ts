import { Request, Response } from 'express';
import { AppDataSource } from '../db/db_connect';
import { Photo } from '../entities/photo.entity';
import { Post } from '../entities/post.entity';
import * as path from 'path';
import * as fs from 'fs';
import multer from 'multer';
import { PhotoPlaceholder } from '../utils/placeholder';
import { ImageMetadata } from '../utils/imageMetadata';

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
    private postRepository = AppDataSource.getRepository(Post);

    async uploadPhoto(req: Request, res: Response) {
        try {
            if (!req.file) {
                return res.status(400).json({ message: 'No file uploaded' });
            }

            const { userId, description, albumId, skipDefaultAlbum } = req.body;
            const filePath = path.join(process.cwd(), 'uploads/photos', req.file.filename);
            
            // Извлекаем метаданные о размерах изображения
            let width: number | undefined;
            let height: number | undefined;
            let filename = req.file.filename;
            
            try {
                const metadata = await ImageMetadata.extractWithSharp(filePath);
                if (metadata) {
                    width = metadata.width;
                    height = metadata.height;
                    
                    // Создаем новое имя файла с размерами
                    const newFilename = ImageMetadata.createFilenameWithDimensions(
                        req.file.filename,
                        metadata.width,
                        metadata.height
                    );
                    
                    // Переименовываем файл, чтобы в имени были размеры
                    const newFilePath = path.join(process.cwd(), 'uploads/photos', newFilename);
                    fs.renameSync(filePath, newFilePath);
                    
                    // Обновляем имя файла в записи
                    filename = newFilename;
                }
            } catch (error) {
                console.error('Ошибка при извлечении метаданных изображения:', error);
                // Продолжаем без метаданных в случае ошибки
            }

            const photo = this.photoRepository.create({
                filename: filename,
                originalName: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size,
                path: filename,
                extension: path.extname(req.file.originalname),
                userId: parseInt(userId),
                description,
                width, // Добавляем ширину
                height // Добавляем высоту
            });

            await this.photoRepository.save(photo);

            // Если указан конкретный альбом, добавляем фото в него
            if (albumId) {
                try {
                    const album = await AppDataSource.getRepository('Album').findOne({
                        where: { id: parseInt(albumId) },
                        relations: ['photos']
                    });

                    if (album) {
                        album.photos.push(photo);
                        album.photosCount = album.photos.length;
                        await AppDataSource.getRepository('Album').save(album);
                    } else {
                        console.error(`Альбом с ID ${albumId} не найден при загрузке фото`);
                    }
                } catch (error) {
                    console.error('Ошибка при добавлении фото в указанный альбом:', error);
                }
            }

            // Если нет флага skipDefaultAlbum, добавляем фото в альбом "Загруженное"
            if (skipDefaultAlbum !== 'true') {
                try {
                    // Ищем или создаем альбом "Загруженное" для пользователя
                    let uploadedAlbum = await AppDataSource.getRepository('Album').findOne({
                        where: {
                            userId: parseInt(userId),
                            title: 'Загруженное'
                        },
                        relations: ['photos']
                    });

                    if (!uploadedAlbum) {
                        uploadedAlbum = AppDataSource.getRepository('Album').create({
                            title: 'Загруженное',
                            description: 'Автоматически созданный альбом для загруженных фотографий',
                            userId: parseInt(userId),
                            isPrivate: false,
                            photos: [],
                            photosCount: 0
                        });
                        await AppDataSource.getRepository('Album').save(uploadedAlbum);
                    }

                    uploadedAlbum.photos.push(photo);
                    uploadedAlbum.photosCount = uploadedAlbum.photos.length;
                    await AppDataSource.getRepository('Album').save(uploadedAlbum);
                } catch (error) {
                    console.error('Ошибка при добавлении фото в альбом "Загруженное":', error);
                }
            }

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
                // Если фото помечено как удаленное, создаем заглушку
                if (photo.isDeleted) {
                    console.log(`[PhotoController] Фото ${id} помечено как удаленное, создаем заглушку`);
                    const placeholderPath = await PhotoPlaceholder.createPlaceholder(photo.extension);
                    return res.sendFile(path.join(process.cwd(), 'uploads/temp', placeholderPath));
                }

                const filePath = path.join(process.cwd(), 'uploads/photos', photo.path);
                if (!fs.existsSync(filePath)) {
                    console.log(`[PhotoController] Файл ${filePath} не найден, создаем заглушку`);
                    const placeholderPath = await PhotoPlaceholder.createPlaceholder(photo.extension);
                    return res.sendFile(path.join(process.cwd(), 'uploads/temp', placeholderPath));
                }
                
                // Если в URL изображения еще нет информации о размерах, но она есть в БД
                if (!photo.path.includes('x') && photo.width && photo.height) {
                    // При необходимости можно было бы переименовать файл, но пока просто возвращаем как есть
                    console.log(`[PhotoController] Файл ${photo.path} содержит размеры ${photo.width}x${photo.height}`);
                }
                
                return res.sendFile(filePath);
            }

            // Если у фото нет сохраненных размеров, но есть файл, попробуем извлечь размеры
            if (!photo.width || !photo.height) {
                const filePath = path.join(process.cwd(), 'uploads/photos', photo.path);
                if (fs.existsSync(filePath)) {
                    try {
                        const metadata = await ImageMetadata.extractWithSharp(filePath);
                        if (metadata) {
                            // Обновляем фото с размерами
                            photo.width = metadata.width;
                            photo.height = metadata.height;
                            await this.photoRepository.save(photo);
                        }
                    } catch (error) {
                        console.error(`[PhotoController] Ошибка при извлечении метаданных для фото ${id}:`, error);
                    }
                }
            }

            // Проверяем, можно ли извлечь размеры из имени файла
            if ((!photo.width || !photo.height) && photo.path) {
                const dimensions = ImageMetadata.extractDimensionsFromFilename(photo.path);
                if (dimensions) {
                    photo.width = dimensions.width;
                    photo.height = dimensions.height;
                    await this.photoRepository.save(photo);
                }
            }

            return res.json(photo);
        } catch (error) {
            console.error('Error getting photo:', error);
            return res.status(500).json({ message: 'Error getting photo' });
        }
    }

    async getPhotoWithWidthHeightByID(req: Request, res: Response) {
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
                    const placeholderPath = await PhotoPlaceholder.createPlaceholder(photo.extension);
                    return res.sendFile(path.join(process.cwd(), 'uploads/temp', placeholderPath));
                }

                const filePath = path.join(process.cwd(), 'uploads/photos', photo.path);
                if (!fs.existsSync(filePath)) {
                    console.log(`[PhotoController] Файл ${filePath} не найден, создаем заглушку`);
                    const placeholderPath = await PhotoPlaceholder.createPlaceholder(photo.extension);
                    return res.sendFile(path.join(process.cwd(), 'uploads/temp', placeholderPath));
                }
                return res.json(filePath);
            }

            
            return res.json({
                
            });
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
            const filePath = path.join(process.cwd(), 'uploads/photos', photo.path);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            // Помечаем фотографию как удаленную
            photo.isDeleted = true;
            await this.photoRepository.save(photo);

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

    async getPhotoFile(req: Request, res: Response) {
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
                const placeholderPath = await PhotoPlaceholder.createPlaceholder(photo.extension);
                return res.sendFile(path.join(process.cwd(), 'uploads/temp', placeholderPath));
            }

            const filePath = path.join(process.cwd(), 'uploads/photos', filename);
            console.log('Запрошен файл:', filePath);

            if (!fs.existsSync(filePath)) {
                console.error('Файл не найден:', filePath);
                return res.status(404).json({ message: 'Файл изображения не найден' });
            }

            return res.sendFile(filePath);
        } catch (error) {
            console.error('Ошибка при получении файла изображения:', error);
            return res.status(500).json({ message: 'Ошибка при получении файла изображения' });
        }
    }

    // Новый метод для отвязки фотографии от поста
    async unlinkPhotoFromPost(req: Request, res: Response) {
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
        } catch (error) {
            console.error('Error unlinking photo from post:', error);
            return res.status(500).json({ message: 'Error unlinking photo from post' });
        }
    }
} 