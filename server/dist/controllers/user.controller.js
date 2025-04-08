"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const common_1 = require("@nestjs/common");
const db_connect_1 = require("../db/db_connect");
const photo_entity_1 = require("../entities/photo.entity");
const path_1 = __importDefault(require("path"));
class UserController {
    constructor(userService) {
        this.userService = userService;
        this.photoRepository = db_connect_1.AppDataSource.getRepository(photo_entity_1.Photo);
    }
    async createUser(req, res) {
        try {
            const user = await this.userService.createUser(req.body);
            res.status(201).json(user);
        }
        catch (error) {
            res.status(400).json({ message: 'Ошибка при создании пользователя', error });
        }
    }
    async getUsers(req, res) {
        try {
            const users = await this.userService.getAllUsers();
            res.json(users);
        }
        catch (error) {
            res.status(500).json({ message: 'Ошибка при получении пользователей', error });
        }
    }
    async getUserByEmail(req, res) {
        try {
            const user = await this.userService.getUserByEmail(req.params.email);
            if (!user) {
                return res.status(404).json({ message: 'Пользователь не найден' });
            }
            res.json(user);
        }
        catch (error) {
            res.status(500).json({ message: 'Ошибка при поиске пользователя', error });
        }
    }
    async getUserByNickname(req, res) {
        try {
            const user = await this.userService.getUserByNickname(req.params.nickname);
            if (!user) {
                return res.status(404).json({ message: 'Пользователь не найден' });
            }
            res.json(user);
        }
        catch (error) {
            res.status(500).json({ message: 'Ошибка при поиске пользователя', error });
        }
    }
    async updateUser(req, res) {
        try {
            const user = await this.userService.updateUser(parseInt(req.params.id), req.body);
            if (!user) {
                return res.status(404).json({ message: 'Пользователь не найден' });
            }
            res.json(user);
        }
        catch (error) {
            res.status(500).json({ message: 'Ошибка при обновлении пользователя', error });
        }
    }
    async deleteUser(req, res) {
        try {
            await this.userService.deleteUser(parseInt(req.params.id));
            res.status(204).send();
        }
        catch (error) {
            res.status(500).json({ message: 'Ошибка при удалении пользователя', error });
        }
    }
    async createRandomUser(req, res) {
        try {
            const randomUser = await this.userService.createRandomUser();
            res.status(201).json(randomUser);
        }
        catch (error) {
            res.status(500).json({ message: 'Ошибка при создании случайного пользователя', error });
        }
    }
    async getUserById(req, res) {
        try {
            const { id } = req.params;
            const user = await this.userService.getUserById(parseInt(id));
            if (!user) {
                return res.status(404).json({ message: 'Пользователь не найден' });
            }
            res.json(user);
        }
        catch (error) {
            res.status(500).json({ message: 'Ошибка при получении пользователя', error });
        }
    }
    async getUser(req, res) {
        try {
            const userId = parseInt(req.params.id);
            if (isNaN(userId)) {
                return res.status(400).json({ message: 'Неверный формат идентификатора пользователя' });
            }
            const user = await this.userService.findUserWithAvatar(userId);
            res.json(user);
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                res.status(404).json({ message: error.message });
            }
            else if (error instanceof common_1.ForbiddenException) {
                res.status(403).json({ message: error.message });
            }
            else {
                console.error('Ошибка при получении пользователя:', error);
                res.status(500).json({ message: 'Ошибка при получении пользователя' });
            }
        }
    }
    async updateStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const userId = parseInt(id);
            // Проверяем, что пользователь обновляет свой собственный статус
            if (req.user && req.user.id !== userId) {
                throw new common_1.ForbiddenException('Вы можете обновлять только свой статус');
            }
            const user = await this.userService.updateStatus(userId, status);
            res.json(user);
        }
        catch (error) {
            if (error instanceof common_1.ForbiddenException) {
                res.status(403).json({ message: error.message });
            }
            else {
                res.status(500).json({ message: 'Ошибка при обновлении статуса', error });
            }
        }
    }
    async uploadAvatar(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ message: 'Файл не загружен' });
            }
            const userId = parseInt(req.params.id);
            // Проверяем, что пользователь меняет свой аватар
            if (req.user.id !== userId) {
                return res.status(403).json({ message: 'Нет прав для изменения аватара другого пользователя' });
            }
            // Создаем запись о фото
            const photo = this.photoRepository.create({
                filename: req.file.filename,
                originalName: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size,
                path: req.file.filename, // Сохраняем только имя файла
                extension: path_1.default.extname(req.file.originalname),
                userId: userId
            });
            await this.photoRepository.save(photo);
            // Обновляем аватар пользователя
            await this.userService.updateAvatar(userId, photo.id);
            const updatedUser = await this.userService.findUserWithAvatar(userId);
            return res.json(updatedUser);
        }
        catch (error) {
            console.error('Ошибка при загрузке аватара:', error);
            return res.status(500).json({ message: 'Ошибка при загрузке аватара' });
        }
    }
}
exports.UserController = UserController;
