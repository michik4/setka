"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const group_controller_1 = require("../controllers/group.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const db_connect_1 = require("../db/db_connect");
const group_entity_1 = require("../entities/group.entity");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const router = (0, express_1.Router)();
const groupController = new group_controller_1.GroupController();
// Маршруты для получения списка групп
router.get('/', groupController.getAllGroups);
router.get('/search', groupController.searchGroups);
router.get('/user', auth_middleware_1.authenticateSession, groupController.getUserGroups);
// Маршруты для получения информации о группе
router.get('/:id', groupController.getGroupById);
router.get('/slug/:slug', groupController.getGroupBySlug);
router.get('/:id/members', groupController.getGroupMembers);
router.get('/:id/admins', groupController.getGroupAdmins);
router.get('/:id/posts', groupController.getGroupPosts);
// Маршрут для получения аватара группы
router.get('/:id/avatar', async (req, res) => {
    try {
        const groupId = parseInt(req.params.id);
        if (isNaN(groupId)) {
            return res.status(400).json({ message: 'Неверный идентификатор группы' });
        }
        // Получаем группу с аватаром
        const group = await db_connect_1.AppDataSource.getRepository(group_entity_1.Group)
            .createQueryBuilder('group')
            .leftJoinAndSelect('group.avatar', 'avatar')
            .where('group.id = :id', { id: groupId })
            .getOne();
        if (!group || !group.avatar) {
            // Если аватар не найден, возвращаем аватар по умолчанию
            const defaultAvatarPath = path_1.default.join(__dirname, '../../public/default-group-avatar.png');
            if (fs_1.default.existsSync(defaultAvatarPath)) {
                return res.sendFile(defaultAvatarPath);
            }
            return res.status(404).json({ message: 'Аватар группы не найден' });
        }
        // Путь к файлу аватара
        const avatarPath = path_1.default.join(__dirname, '../../uploads/photos', group.avatar.path);
        // Проверяем существование файла
        if (!fs_1.default.existsSync(avatarPath)) {
            const defaultAvatarPath = path_1.default.join(__dirname, '../../public/default-group-avatar.png');
            if (fs_1.default.existsSync(defaultAvatarPath)) {
                return res.sendFile(defaultAvatarPath);
            }
            return res.status(404).json({ message: 'Файл аватара не найден' });
        }
        // Отправляем файл
        res.sendFile(avatarPath);
    }
    catch (error) {
        console.error('Ошибка при получении аватара группы:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера' });
    }
});
// Маршруты для создания и управления группой
router.post('/', auth_middleware_1.authenticateSession, groupController.createGroup);
router.put('/:id', auth_middleware_1.authenticateSession, groupController.updateGroup);
router.delete('/:id', auth_middleware_1.authenticateSession, groupController.deleteGroup);
// Маршрут для загрузки аватара группы
router.post('/:id/avatar', auth_middleware_1.authenticateSession, (req, res, next) => {
    group_controller_1.uploadGroupAvatar.single('avatar')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ message: err.message });
        }
        const authenticatedReq = req;
        return groupController.uploadAvatar(authenticatedReq, res);
    });
});
// Маршруты для членства в группе
router.post('/:id/join', auth_middleware_1.authenticateSession, groupController.joinGroup);
router.post('/:id/leave', auth_middleware_1.authenticateSession, groupController.leaveGroup);
router.delete('/:id/members/:userId', auth_middleware_1.authenticateSession, groupController.removeMember);
router.post('/:id/ban', auth_middleware_1.authenticateSession, groupController.banMember);
// Маршруты для управления администраторами
router.post('/:id/admins', auth_middleware_1.authenticateSession, groupController.addAdmin);
router.delete('/:id/admins', auth_middleware_1.authenticateSession, groupController.removeAdmin);
router.get('/user/:userId/admin', auth_middleware_1.authenticateSession, groupController.getUserAdminGroups);
// Добавим новые эндпоинты для получения медиа-контента группы
router.get('/:id/media/photos', groupController.getGroupPhotos);
router.get('/:id/media/albums', groupController.getGroupAlbums);
router.get('/:id/media/tracks', groupController.getGroupTracks);
router.get('/:id/media/music-albums', groupController.getGroupMusicAlbums);
exports.default = router;
