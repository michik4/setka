"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const auth_middleware_1 = require("../middleware/auth.middleware");
const music_album_controller_1 = __importDefault(require("../controllers/music_album.controller"));
const router = (0, express_1.Router)();
// Настройка хранилища для multer
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        let uploadDir;
        if (file.fieldname === 'audioFile' || file.fieldname === 'audioFiles') {
            uploadDir = path_1.default.join(__dirname, '../../uploads/music');
        }
        else if (file.fieldname === 'coverImage') {
            uploadDir = path_1.default.join(__dirname, '../../uploads/covers');
        }
        else {
            uploadDir = path_1.default.join(__dirname, '../../uploads/other');
        }
        // Создаем директорию, если она не существует
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        // Для отладки
        console.log(`[Storage] Сохранение файла ${file.fieldname} (${file.originalname}) в директорию ${uploadDir}`);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueFileName = `${(0, uuid_1.v4)()}${path_1.default.extname(file.originalname)}`;
        console.log(`[Storage] Генерация имени файла: ${uniqueFileName} для ${file.originalname}`);
        cb(null, uniqueFileName);
    }
});
// Получение всех альбомов пользователя
router.get('/', auth_middleware_1.authenticateSession, (req, res, next) => {
    const authenticatedReq = req;
    music_album_controller_1.default.getUserAlbums(authenticatedReq, res);
});
// Получение альбома по ID
router.get('/:albumId', auth_middleware_1.authenticateSession, (req, res, next) => {
    const authenticatedReq = req;
    music_album_controller_1.default.getAlbumById(authenticatedReq, res);
});
// Создание нового альбома
router.post('/', auth_middleware_1.authenticateSession, (req, res, next) => {
    const authenticatedReq = req;
    music_album_controller_1.default.createAlbum(authenticatedReq, res);
});
// Обновление альбома
router.put('/:albumId', auth_middleware_1.authenticateSession, (req, res, next) => {
    const authenticatedReq = req;
    music_album_controller_1.default.updateAlbum(authenticatedReq, res);
});
// Удаление альбома
router.delete('/:albumId', auth_middleware_1.authenticateSession, (req, res, next) => {
    const authenticatedReq = req;
    music_album_controller_1.default.deleteAlbum(authenticatedReq, res);
});
// Добавление трека в альбом
router.post('/:albumId/tracks', auth_middleware_1.authenticateSession, (req, res, next) => {
    const authenticatedReq = req;
    music_album_controller_1.default.addTrackToAlbum(authenticatedReq, res);
});
// Удаление трека из альбома
router.delete('/:albumId/tracks/:trackId', auth_middleware_1.authenticateSession, (req, res, next) => {
    const authenticatedReq = req;
    music_album_controller_1.default.removeTrackFromAlbum(authenticatedReq, res);
});
// Загрузка обложки альбома
router.post('/:albumId/cover', auth_middleware_1.authenticateSession, (req, res, next) => {
    (0, multer_1.default)({ storage }).single('coverImage')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ message: 'Ошибка при загрузке файла' });
        }
        const authenticatedReq = req;
        music_album_controller_1.default.uploadAlbumCover(authenticatedReq, res);
    });
});
// Загрузка нескольких треков сразу в альбом
router.post('/:albumId/upload/tracks', auth_middleware_1.authenticateSession, (req, res, next) => {
    (0, multer_1.default)({
        storage,
        limits: {
            fileSize: 100 * 1024 * 1024 // 100 MB
        }
    }).array('audioFiles', 20)(req, res, (err) => {
        if (err) {
            return res.status(400).json({ message: 'Ошибка при загрузке файлов' });
        }
        const authenticatedReq = req;
        music_album_controller_1.default.uploadTracksToAlbum(authenticatedReq, res);
    });
});
// Установка обложки альбома из URL трека
router.post('/:albumId/cover-from-track', auth_middleware_1.authenticateSession, (req, res, next) => {
    const authenticatedReq = req;
    music_album_controller_1.default.setCoverFromUrl(authenticatedReq, res);
});
exports.default = router;
