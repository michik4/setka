"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const wall_controller_1 = require("../controllers/wall.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const post_controller_1 = require("../controllers/post.controller");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
const router = (0, express_1.Router)();
const wallController = new wall_controller_1.WallController();
const postController = new post_controller_1.PostController();
// Настройка хранилища для загрузки файлов
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path_1.default.join(__dirname, '../../uploads/'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = (0, crypto_1.randomUUID)();
        cb(null, uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
// Настраиваем multer с дополнительными опциями
const upload = (0, multer_1.default)({
    storage,
    // Лимит размера файла - 10 МБ
    limits: {
        fileSize: 10 * 1024 * 1024
    },
    // Разрешаем только изображения
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Разрешены только изображения'));
        }
    }
});
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
// Получение записей со стены пользователя
router.get('/:userId', auth_middleware_1.authenticateSession, handleRequest(wallController.getWallPosts.bind(wallController)));
// Создание новой записи на стене (устаревший эндпоинт, сохранен для обратной совместимости)
router.post('/', auth_middleware_1.authenticateSession, handleRequest(wallController.createWallPost.bind(wallController)));
// Новый эндпоинт для создания поста на стене с поддержкой загрузки файлов
router.post('/posts', auth_middleware_1.authenticateSession, upload.array('photos', 4), handleRequest(wallController.createWallPost.bind(wallController)));
// Удаление записи со стены
router.delete('/:postId', auth_middleware_1.authenticateSession, handleRequest(wallController.deleteWallPost.bind(wallController)));
// Редактирование записи на стене
router.put('/:postId', auth_middleware_1.authenticateSession, handleRequest(wallController.updateWallPost.bind(wallController)));
// Поставить/убрать лайк посту на стене
router.post('/:id/like', auth_middleware_1.authenticateSession, handleRequest(postController.toggleLike.bind(postController)));
// Проверить статус лайка поста на стене
router.get('/:id/like', auth_middleware_1.authenticateSession, handleRequest(postController.checkLike.bind(postController)));
exports.default = router;
