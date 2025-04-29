"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const photo_controller_1 = require("../controllers/photo.controller");
const router = (0, express_1.Router)();
const photoController = new photo_controller_1.PhotoController();
// Загрузка одиночной фотографии
router.post('/', photo_controller_1.upload.single('photo'), photoController.uploadPhoto.bind(photoController));
// Получение всех фотографий
router.get('/all', photoController.getAllPhotos.bind(photoController));
// Получение фотографий пользователя
router.get('/user/:userId', photoController.getUserPhotos.bind(photoController));
// Получение файла изображения по имени файла
router.get('/file/:filename', photoController.getPhotoFile.bind(photoController));
// Получение фотографии по ID
router.get('/:id', photoController.getPhotoById.bind(photoController));
// Отвязка фотографии от поста
router.delete('/:photoId/posts/:postId', photoController.unlinkPhotoFromPost.bind(photoController));
// Удаление фотографии
router.delete('/:id', photoController.deletePhoto.bind(photoController));
exports.default = router;
