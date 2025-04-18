"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlbumController = void 0;
const db_connect_1 = require("../db/db_connect");
const album_entity_1 = require("../entities/album.entity");
const photo_entity_1 = require("../entities/photo.entity");
class AlbumController {
    constructor() {
        this.albumRepository = db_connect_1.AppDataSource.getRepository(album_entity_1.Album);
        this.photoRepository = db_connect_1.AppDataSource.getRepository(photo_entity_1.Photo);
    }
    // Создание нового альбома
    async createAlbum(req, res) {
        var _a;
        try {
            const { title, description, isPrivate, photoIds } = req.body;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                return res.status(401).json({ message: 'Необходима авторизация' });
            }
            const album = this.albumRepository.create({
                title,
                description,
                userId,
                isPrivate: isPrivate || false,
                photos: [],
                photosCount: 0
            });
            await this.albumRepository.save(album);
            if (photoIds && photoIds.length > 0) {
                const photos = await this.photoRepository.findByIds(photoIds);
                album.photos = photos;
                album.photosCount = photos.length;
                await this.albumRepository.save(album);
            }
            // Загружаем альбом с фотографиями для ответа
            const albumWithPhotos = await this.albumRepository.findOne({
                where: { id: album.id },
                relations: ['photos']
            });
            return res.status(201).json(albumWithPhotos);
        }
        catch (error) {
            console.error('Ошибка при создании альбома:', error);
            return res.status(500).json({ message: 'Ошибка при создании альбома' });
        }
    }
    // Получение альбомов пользователя
    async getUserAlbums(req, res) {
        try {
            const { userId } = req.params;
            console.log('Getting albums for user:', userId);
            console.log('Authenticated user:', req.user);
            const albums = await this.albumRepository.find({
                where: { userId: parseInt(userId) },
                relations: ['photos'],
                order: { createdAt: 'DESC' }
            });
            console.log('Found albums:', albums.length);
            return res.json(albums);
        }
        catch (error) {
            console.error('Ошибка при получении альбомов:', error);
            return res.status(500).json({ message: 'Ошибка при получении альбомов' });
        }
    }
    // Получение конкретного альбома
    async getAlbum(req, res) {
        try {
            const { albumId } = req.params;
            const album = await this.albumRepository.findOne({
                where: { id: parseInt(albumId) },
                relations: ['photos', 'user']
            });
            if (!album) {
                return res.status(404).json({ message: 'Альбом не найден' });
            }
            return res.json(album);
        }
        catch (error) {
            console.error('Ошибка при получении альбома:', error);
            return res.status(500).json({ message: 'Ошибка при получении альбома' });
        }
    }
    // Добавление фотографий в альбом
    async addPhotosToAlbum(req, res) {
        var _a;
        try {
            const { albumId } = req.params;
            const { photoIds } = req.body;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            const album = await this.albumRepository.findOne({
                where: { id: parseInt(albumId) },
                relations: ['photos']
            });
            if (!album) {
                return res.status(404).json({ message: 'Альбом не найден' });
            }
            if (album.userId !== userId) {
                return res.status(403).json({ message: 'Нет прав для редактирования альбома' });
            }
            const photos = await this.photoRepository.findByIds(photoIds);
            album.photos = [...album.photos, ...photos];
            album.photosCount = album.photos.length;
            await this.albumRepository.save(album);
            return res.json(album);
        }
        catch (error) {
            console.error('Ошибка при добавлении фотографий:', error);
            return res.status(500).json({ message: 'Ошибка при добавлении фотографий' });
        }
    }
    // Удаление фотографий из альбома
    async removePhotosFromAlbum(req, res) {
        var _a;
        try {
            const { albumId } = req.params;
            const { photoIds } = req.body;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            const album = await this.albumRepository.findOne({
                where: { id: parseInt(albumId) },
                relations: ['photos']
            });
            if (!album) {
                return res.status(404).json({ message: 'Альбом не найден' });
            }
            if (album.userId !== userId) {
                return res.status(403).json({ message: 'Нет прав для редактирования альбома' });
            }
            album.photos = album.photos.filter(photo => !photoIds.includes(photo.id));
            album.photosCount = album.photos.length;
            await this.albumRepository.save(album);
            return res.json(album);
        }
        catch (error) {
            console.error('Ошибка при удалении фотографий:', error);
            return res.status(500).json({ message: 'Ошибка при удалении фотографий' });
        }
    }
    // Удаление альбома
    async deleteAlbum(req, res) {
        var _a;
        try {
            const { albumId } = req.params;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            const album = await this.albumRepository.findOne({
                where: { id: parseInt(albumId) }
            });
            if (!album) {
                return res.status(404).json({ message: 'Альбом не найден' });
            }
            if (album.userId !== userId) {
                return res.status(403).json({ message: 'Нет прав для удаления альбома' });
            }
            await this.albumRepository.remove(album);
            return res.json({ message: 'Альбом успешно удален' });
        }
        catch (error) {
            console.error('Ошибка при удалении альбома:', error);
            return res.status(500).json({ message: 'Ошибка при удалении альбома' });
        }
    }
    // Обновление информации об альбоме
    async updateAlbum(req, res) {
        var _a;
        try {
            const { albumId } = req.params;
            const { title, description, isPrivate } = req.body;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            const album = await this.albumRepository.findOne({
                where: { id: parseInt(albumId) }
            });
            if (!album) {
                return res.status(404).json({ message: 'Альбом не найден' });
            }
            if (album.userId !== userId) {
                return res.status(403).json({ message: 'Нет прав для редактирования альбома' });
            }
            album.title = title || album.title;
            album.description = description !== undefined ? description : album.description;
            album.isPrivate = isPrivate !== undefined ? isPrivate : album.isPrivate;
            await this.albumRepository.save(album);
            return res.json(album);
        }
        catch (error) {
            console.error('Ошибка при обновлении альбома:', error);
            return res.status(500).json({ message: 'Ошибка при обновлении альбома' });
        }
    }
    // Получение обложки альбома
    async getAlbumCover(req, res) {
        try {
            const { albumId } = req.params;
            console.log(`Запрос обложки для альбома ${albumId}`);
            // Получаем фотографии альбома, отсортированные по убыванию ID (сначала новые)
            const photosQuery = await db_connect_1.AppDataSource.query(`
                SELECT p.id, p.filename, p.path, p."originalName", p.mimetype, p.size
                FROM photo p
                JOIN album_photos ap ON p.id = ap."photoId"
                WHERE ap."albumId" = $1
                ORDER BY p.id DESC
                LIMIT 1
            `, [albumId]);
            if (!photosQuery || photosQuery.length === 0) {
                console.log(`Альбом ${albumId} не содержит фотографий`);
                return res.status(404).json({ message: 'Альбом не содержит фотографий' });
            }
            // Берем первую фотографию как обложку (самую новую)
            const coverPhoto = photosQuery[0];
            // Преобразуем ID в числовой тип для консистентности
            coverPhoto.id = Number(coverPhoto.id);
            console.log(`Возвращаем обложку для альбома ${albumId}: фото ID=${coverPhoto.id}, путь=${coverPhoto.path}`);
            return res.json(coverPhoto);
        }
        catch (error) {
            console.error(`Ошибка при получении обложки альбома ${req.params.albumId}:`, error);
            return res.status(500).json({ message: 'Ошибка при получении обложки альбома' });
        }
    }
}
exports.AlbumController = AlbumController;
