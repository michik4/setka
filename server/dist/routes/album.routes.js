"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const album_controller_1 = require("../controllers/album.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const albumController = new album_controller_1.AlbumController();
// Middleware для приведения типов
const handleRequest = (handler) => {
    return async (req, res, next) => {
        try {
            await handler(req, res);
        }
        catch (error) {
            next(error);
        }
    };
};
// Получение альбомов пользователя
router.get('/user/:userId', auth_middleware_1.authenticateSession, handleRequest(albumController.getUserAlbums.bind(albumController)));
// Получение конкретного альбома
router.get('/:albumId', auth_middleware_1.authenticateSession, handleRequest(albumController.getAlbum.bind(albumController)));
// Получение обложки альбома
router.get('/:albumId/cover', auth_middleware_1.authenticateSession, handleRequest(albumController.getAlbumCover.bind(albumController)));
// Создание нового альбома (требует авторизации)
router.post('/', auth_middleware_1.authenticateSession, handleRequest(albumController.createAlbum.bind(albumController)));
// Обновление информации об альбоме (требует авторизации)
router.put('/:albumId', auth_middleware_1.authenticateSession, handleRequest(albumController.updateAlbum.bind(albumController)));
// Добавление фотографий в альбом (требует авторизации)
router.post('/:albumId/photos', auth_middleware_1.authenticateSession, handleRequest(albumController.addPhotosToAlbum.bind(albumController)));
// Удаление фотографий из альбома (требует авторизации)
router.delete('/:albumId/photos', auth_middleware_1.authenticateSession, handleRequest(albumController.removePhotosFromAlbum.bind(albumController)));
// Удаление альбома (требует авторизации)
router.delete('/:albumId', auth_middleware_1.authenticateSession, handleRequest(albumController.deleteAlbum.bind(albumController)));
exports.default = router;
