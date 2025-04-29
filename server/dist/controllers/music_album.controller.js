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
exports.MusicAlbumController = void 0;
const db_connect_1 = require("../db/db_connect");
const music_album_entity_1 = require("../entities/music_album.entity");
const music_entity_1 = require("../entities/music.entity");
class MusicAlbumController {
    constructor() {
        this.albumRepository = db_connect_1.AppDataSource.getRepository(music_album_entity_1.MusicAlbum);
        this.trackRepository = db_connect_1.AppDataSource.getRepository(music_entity_1.MusicTrack);
    }
    // Создание нового музыкального альбома
    async createAlbum(req, res) {
        var _a;
        try {
            const { title, description, isPrivate, trackIds } = req.body;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                return res.status(401).json({ message: 'Необходима авторизация' });
            }
            const album = this.albumRepository.create({
                title,
                description,
                userId,
                isPrivate: isPrivate || false,
                tracks: [],
                tracksCount: 0
            });
            await this.albumRepository.save(album);
            if (trackIds && trackIds.length > 0) {
                const tracks = await this.trackRepository
                    .createQueryBuilder('track')
                    .where('track.id IN (:...ids)', { ids: trackIds })
                    .andWhere('track.userId = :userId', { userId })
                    .getMany();
                album.tracks = tracks;
                album.tracksCount = tracks.length;
                await this.albumRepository.save(album);
            }
            // Загружаем альбом с треками для ответа
            const albumWithTracks = await this.albumRepository.findOne({
                where: { id: album.id },
                relations: ['tracks']
            });
            return res.status(201).json(albumWithTracks);
        }
        catch (error) {
            console.error('Ошибка при создании музыкального альбома:', error);
            return res.status(500).json({ message: 'Ошибка при создании музыкального альбома' });
        }
    }
    // Получение всех альбомов пользователя
    async getUserAlbums(req, res) {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                return res.status(401).json({ message: 'Необходима авторизация' });
            }
            const albums = await this.albumRepository.find({
                where: { userId },
                order: { createdAt: 'DESC' }
            });
            return res.status(200).json(albums);
        }
        catch (error) {
            console.error('Ошибка при получении альбомов пользователя:', error);
            return res.status(500).json({ message: 'Ошибка при получении альбомов' });
        }
    }
    // Получение альбома по ID
    async getAlbumById(req, res) {
        var _a;
        try {
            const { albumId } = req.params;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                return res.status(401).json({ message: 'Необходима авторизация' });
            }
            const album = await this.albumRepository.findOne({
                where: { id: parseInt(albumId) },
                relations: ['tracks']
            });
            if (!album) {
                return res.status(404).json({ message: 'Альбом не найден' });
            }
            // Проверка прав доступа
            if (album.userId !== userId && album.isPrivate) {
                return res.status(403).json({ message: 'Нет доступа к этому альбому' });
            }
            return res.status(200).json(album);
        }
        catch (error) {
            console.error(`Ошибка при получении альбома ${req.params.albumId}:`, error);
            return res.status(500).json({ message: 'Ошибка при получении альбома' });
        }
    }
    // Обновление альбома
    async updateAlbum(req, res) {
        var _a;
        try {
            const { albumId } = req.params;
            const { title, description, isPrivate, trackIds } = req.body;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                return res.status(401).json({ message: 'Необходима авторизация' });
            }
            const album = await this.albumRepository.findOne({
                where: { id: parseInt(albumId) },
                relations: ['tracks']
            });
            if (!album) {
                return res.status(404).json({ message: 'Альбом не найден' });
            }
            // Проверка прав на редактирование
            if (album.userId !== userId) {
                return res.status(403).json({ message: 'Нет прав на редактирование этого альбома' });
            }
            // Обновляем основные данные
            album.title = title || album.title;
            album.description = description !== undefined ? description : album.description;
            album.isPrivate = isPrivate !== undefined ? isPrivate : album.isPrivate;
            // Обновляем список треков, если он был предоставлен
            if (trackIds && trackIds.length > 0) {
                const tracks = await this.trackRepository
                    .createQueryBuilder('track')
                    .where('track.id IN (:...ids)', { ids: trackIds })
                    .andWhere('track.userId = :userId', { userId })
                    .getMany();
                album.tracks = tracks;
                album.tracksCount = tracks.length;
            }
            await this.albumRepository.save(album);
            return res.status(200).json(album);
        }
        catch (error) {
            console.error(`Ошибка при обновлении альбома ${req.params.albumId}:`, error);
            return res.status(500).json({ message: 'Ошибка при обновлении альбома' });
        }
    }
    // Удаление альбома
    async deleteAlbum(req, res) {
        var _a;
        try {
            const { albumId } = req.params;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                return res.status(401).json({ message: 'Необходима авторизация' });
            }
            const album = await this.albumRepository.findOne({
                where: { id: parseInt(albumId) }
            });
            if (!album) {
                return res.status(404).json({ message: 'Альбом не найден' });
            }
            // Проверка прав на удаление
            if (album.userId !== userId) {
                return res.status(403).json({ message: 'Нет прав на удаление этого альбома' });
            }
            // Удаляем связи с треками и затем сам альбом
            await this.albumRepository.remove(album);
            return res.status(200).json({ message: 'Альбом успешно удален' });
        }
        catch (error) {
            console.error(`Ошибка при удалении альбома ${req.params.albumId}:`, error);
            return res.status(500).json({ message: 'Ошибка при удалении альбома' });
        }
    }
    // Добавление трека в альбом
    async addTrackToAlbum(req, res) {
        var _a;
        try {
            const { albumId } = req.params;
            const { trackId } = req.body;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                return res.status(401).json({ message: 'Необходима авторизация' });
            }
            const album = await this.albumRepository.findOne({
                where: { id: parseInt(albumId) },
                relations: ['tracks']
            });
            if (!album) {
                return res.status(404).json({ message: 'Альбом не найден' });
            }
            // Проверка прав на редактирование
            if (album.userId !== userId) {
                return res.status(403).json({ message: 'Нет прав на редактирование этого альбома' });
            }
            const track = await this.trackRepository.findOne({
                where: { id: parseInt(trackId) }
            });
            if (!track) {
                return res.status(404).json({ message: 'Трек не найден' });
            }
            // Проверяем, есть ли уже трек в альбоме
            const trackExists = album.tracks.some(t => t.id === track.id);
            if (trackExists) {
                return res.status(400).json({ message: 'Этот трек уже добавлен в альбом' });
            }
            // Добавляем трек в альбом
            album.tracks.push(track);
            album.tracksCount = album.tracks.length;
            await this.albumRepository.save(album);
            return res.status(200).json({ message: 'Трек успешно добавлен в альбом', album });
        }
        catch (error) {
            console.error(`Ошибка при добавлении трека в альбом ${req.params.albumId}:`, error);
            return res.status(500).json({ message: 'Ошибка при добавлении трека в альбом' });
        }
    }
    // Удаление трека из альбома
    async removeTrackFromAlbum(req, res) {
        var _a;
        try {
            const { albumId, trackId } = req.params;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                return res.status(401).json({ message: 'Необходима авторизация' });
            }
            const album = await this.albumRepository.findOne({
                where: { id: parseInt(albumId) },
                relations: ['tracks']
            });
            if (!album) {
                return res.status(404).json({ message: 'Альбом не найден' });
            }
            // Проверка прав на редактирование
            if (album.userId !== userId) {
                return res.status(403).json({ message: 'Нет прав на редактирование этого альбома' });
            }
            // Фильтруем треки, удаляя указанный
            album.tracks = album.tracks.filter(track => track.id !== parseInt(trackId));
            album.tracksCount = album.tracks.length;
            await this.albumRepository.save(album);
            return res.status(200).json({ message: 'Трек успешно удален из альбома', album });
        }
        catch (error) {
            console.error(`Ошибка при удалении трека из альбома ${req.params.albumId}:`, error);
            return res.status(500).json({ message: 'Ошибка при удалении трека из альбома' });
        }
    }
    // Загрузка обложки альбома
    async uploadAlbumCover(req, res) {
        var _a;
        try {
            if (!req.file) {
                return res.status(400).json({ message: 'Файл обложки не загружен' });
            }
            const { albumId } = req.params;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                return res.status(401).json({ message: 'Необходима авторизация' });
            }
            const album = await this.albumRepository.findOne({
                where: { id: parseInt(albumId) }
            });
            if (!album) {
                return res.status(404).json({ message: 'Альбом не найден' });
            }
            // Проверка прав на редактирование
            if (album.userId !== userId) {
                return res.status(403).json({ message: 'Нет прав на редактирование этого альбома' });
            }
            // Сохраняем ссылку на обложку в альбоме
            album.coverUrl = req.file.filename;
            await this.albumRepository.save(album);
            return res.status(200).json({
                message: 'Обложка альбома успешно загружена',
                coverUrl: album.coverUrl
            });
        }
        catch (error) {
            console.error(`Ошибка при загрузке обложки альбома ${req.params.albumId}:`, error);
            return res.status(500).json({ message: 'Ошибка при загрузке обложки альбома' });
        }
    }
    // Массовая загрузка треков в альбом
    async uploadTracksToAlbum(req, res) {
        var _a;
        try {
            const { albumId } = req.params;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            const audioFiles = req.files;
            if (!userId) {
                return res.status(401).json({ message: 'Необходима авторизация' });
            }
            if (!audioFiles || audioFiles.length === 0) {
                return res.status(400).json({ message: 'Аудиофайлы не загружены' });
            }
            const album = await this.albumRepository.findOne({
                where: { id: parseInt(albumId) },
                relations: ['tracks']
            });
            if (!album) {
                return res.status(404).json({ message: 'Альбом не найден' });
            }
            // Проверка прав на редактирование
            if (album.userId !== userId) {
                return res.status(403).json({ message: 'Нет прав на редактирование этого альбома' });
            }
            const results = [];
            const musicController = await Promise.resolve().then(() => __importStar(require('../controllers/music.controller')));
            const controller = new musicController.MusicController();
            // Обрабатываем каждый загруженный файл
            for (const audioFile of audioFiles) {
                try {
                    // Используем существующий метод для загрузки треков
                    const track = await controller.uploadTrack(req, audioFile, null);
                    // Добавляем трек в альбом
                    if (!album.tracks.some(t => t.id === track.id)) {
                        album.tracks.push(track);
                        results.push({
                            success: true,
                            track: {
                                id: track.id,
                                title: track.title,
                                artist: track.artist,
                                duration: track.duration,
                                coverUrl: track.coverUrl
                            }
                        });
                    }
                    else {
                        results.push({
                            success: false,
                            originalName: audioFile.originalname,
                            error: 'Трек уже существует в альбоме'
                        });
                    }
                }
                catch (error) {
                    results.push({
                        success: false,
                        originalName: audioFile.originalname,
                        error: error instanceof Error ? error.message : 'Ошибка при обработке файла'
                    });
                }
            }
            // Обновляем счетчик треков и сохраняем альбом
            album.tracksCount = album.tracks.length;
            await this.albumRepository.save(album);
            return res.status(200).json({
                message: 'Треки успешно загружены',
                albumId: album.id,
                tracksCount: album.tracksCount,
                results
            });
        }
        catch (error) {
            console.error(`Ошибка при загрузке треков в альбом ${req.params.albumId}:`, error);
            return res.status(500).json({ message: 'Ошибка при загрузке треков в альбом' });
        }
    }
    // Установка обложки альбома из URL трека
    async setCoverFromUrl(req, res) {
        var _a;
        try {
            const { albumId } = req.params;
            const { coverUrl } = req.body;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                return res.status(401).json({ message: 'Необходима авторизация' });
            }
            if (!coverUrl) {
                return res.status(400).json({ message: 'URL обложки не указан' });
            }
            const album = await this.albumRepository.findOne({
                where: { id: parseInt(albumId) }
            });
            if (!album) {
                return res.status(404).json({ message: 'Альбом не найден' });
            }
            // Проверка прав на редактирование
            if (album.userId !== userId) {
                return res.status(403).json({ message: 'Нет прав на редактирование этого альбома' });
            }
            // Устанавливаем URL обложки из трека
            album.coverUrl = coverUrl;
            await this.albumRepository.save(album);
            return res.status(200).json({
                message: 'Обложка альбома успешно обновлена',
                album
            });
        }
        catch (error) {
            console.error(`Ошибка при установке обложки для альбома ${req.params.albumId}:`, error);
            return res.status(500).json({ message: 'Ошибка при установке обложки альбома' });
        }
    }
}
exports.MusicAlbumController = MusicAlbumController;
exports.default = new MusicAlbumController();
