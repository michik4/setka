"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_service_1 = require("../services/user.service");
const user_controller_1 = require("../controllers/user.controller");
const db_connect_1 = require("../db/db_connect");
const auth_middleware_1 = require("../middleware/auth.middleware");
const upload_1 = require("../utils/upload");
const user_entity_1 = require("../entities/user.entity");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const router = (0, express_1.Router)();
const userService = new user_service_1.UserService();
const userController = new user_controller_1.UserController(userService);
// Публичные маршруты
router.post('/', userController.createUser.bind(userController));
router.post('/random', userController.createRandomUser.bind(userController));
// Защищенные маршруты
router.get('/', auth_middleware_1.authenticateSession, userController.getUsers.bind(userController));
router.get('/email/:email', auth_middleware_1.authenticateSession, userController.getUserByEmail.bind(userController));
router.get('/nickname/:nickname', auth_middleware_1.authenticateSession, userController.getUserByNickname.bind(userController));
router.get('/:id', auth_middleware_1.authenticateSession, userController.getUserById.bind(userController));
router.put('/:id', auth_middleware_1.authenticateSession, userController.updateUser.bind(userController));
router.delete('/:id', auth_middleware_1.authenticateSession, userController.deleteUser.bind(userController));
router.put('/:id/status', auth_middleware_1.authenticateSession, userController.updateStatus.bind(userController));
// Маршрут для получения аватара пользователя
router.get('/:id/avatar', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        if (isNaN(userId)) {
            return res.status(400).json({ message: 'Неверный идентификатор пользователя' });
        }
        // Получаем пользователя с аватаром
        const user = await db_connect_1.AppDataSource.getRepository(user_entity_1.User)
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.avatar', 'avatar')
            .where('user.id = :id', { id: userId })
            .getOne();
        if (!user || !user.avatar) {
            // Если аватар не найден, возвращаем аватар по умолчанию
            const defaultAvatarPath = path_1.default.join(__dirname, '../../public/default-avatar.png');
            if (fs_1.default.existsSync(defaultAvatarPath)) {
                return res.sendFile(defaultAvatarPath);
            }
            return res.status(404).json({ message: 'Аватар пользователя не найден' });
        }
        // Путь к файлу аватара
        const avatarPath = path_1.default.join(__dirname, '../../uploads/photos', user.avatar.path);
        // Проверяем существование файла
        if (!fs_1.default.existsSync(avatarPath)) {
            // Если файл не найден, возвращаем аватар по умолчанию
            const defaultAvatarPath = path_1.default.join(__dirname, '../../public/default-avatar.png');
            if (fs_1.default.existsSync(defaultAvatarPath)) {
                return res.sendFile(defaultAvatarPath);
            }
            return res.status(404).json({ message: 'Файл аватара не найден' });
        }
        // Отправляем файл
        res.sendFile(avatarPath);
    }
    catch (error) {
        console.error('Ошибка при получении аватара пользователя:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера' });
    }
});
// Обработчик ошибок multer
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer_1.default.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'Файл слишком большой. Максимальный размер 5MB' });
        }
        return res.status(400).json({ message: 'Ошибка при загрузке файла' });
    }
    else if (err) {
        return res.status(400).json({ message: err.message });
    }
    next();
};
// Обработчик для загрузки аватара с правильной типизацией
router.post('/:id/avatar', auth_middleware_1.authenticateSession, (req, res, next) => {
    upload_1.upload.single('avatar')(req, res, (err) => {
        if (err) {
            return handleMulterError(err, req, res, next);
        }
        const authenticatedReq = req;
        return userController.uploadAvatar(authenticatedReq, res);
    });
});
exports.default = router;
