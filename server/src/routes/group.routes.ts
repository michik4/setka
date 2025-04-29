import { Router, Request, Response, NextFunction } from 'express';
import { GroupController, uploadGroupAvatar } from '../controllers/group.controller';
import { authenticateSession } from '../middleware/auth.middleware';
import { AuthRequest } from '../types/auth.types';
import { AppDataSource } from '../db/db_connect';
import { Group } from '../entities/group.entity';
import path from 'path';
import fs from 'fs';

const router = Router();
const groupController = new GroupController();

// Маршруты для получения списка групп
router.get('/', groupController.getAllGroups);
router.get('/search', groupController.searchGroups);
router.get('/user', authenticateSession, groupController.getUserGroups);

// Маршруты для получения информации о группе
router.get('/:id', groupController.getGroupById);
router.get('/slug/:slug', groupController.getGroupBySlug);
router.get('/:id/members', groupController.getGroupMembers);
router.get('/:id/admins', groupController.getGroupAdmins);
router.get('/:id/posts', groupController.getGroupPosts);

// Маршрут для получения аватара группы
router.get('/:id/avatar', async (req: Request, res: Response) => {
    try {
        const groupId = parseInt(req.params.id);
        if (isNaN(groupId)) {
            return res.status(400).json({ message: 'Неверный идентификатор группы' });
        }

        // Получаем группу с аватаром
        const group = await AppDataSource.getRepository(Group)
            .createQueryBuilder('group')
            .leftJoinAndSelect('group.avatar', 'avatar')
            .where('group.id = :id', { id: groupId })
            .getOne();

        if (!group || !group.avatar) {
            // Если аватар не найден, возвращаем аватар по умолчанию
            const defaultAvatarPath = path.join(__dirname, '../../public/default-group-avatar.png');
            if (fs.existsSync(defaultAvatarPath)) {
                return res.sendFile(defaultAvatarPath);
            }
            return res.status(404).json({ message: 'Аватар группы не найден' });
        }

        // Путь к файлу аватара
        const avatarPath = path.join(__dirname, '../../uploads/photos', group.avatar.path);
        
        // Проверяем существование файла
        if (!fs.existsSync(avatarPath)) {
            const defaultAvatarPath = path.join(__dirname, '../../public/default-group-avatar.png');
            if (fs.existsSync(defaultAvatarPath)) {
                return res.sendFile(defaultAvatarPath);
            }
            return res.status(404).json({ message: 'Файл аватара не найден' });
        }

        // Отправляем файл
        res.sendFile(avatarPath);
    } catch (error) {
        console.error('Ошибка при получении аватара группы:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера' });
    }
});

// Маршруты для создания и управления группой
router.post('/', authenticateSession, groupController.createGroup);
router.put('/:id', authenticateSession, groupController.updateGroup);
router.delete('/:id', authenticateSession, groupController.deleteGroup);

// Маршрут для загрузки аватара группы
router.post(
    '/:id/avatar',
    authenticateSession,
    (req: Request, res: Response, next: NextFunction) => {
        uploadGroupAvatar.single('avatar')(req, res, (err) => {
            if (err) {
                return res.status(400).json({ message: err.message });
            }
            const authenticatedReq = req as AuthRequest;
            return groupController.uploadAvatar(authenticatedReq, res);
        });
    }
);

// Маршруты для членства в группе
router.post('/:id/join', authenticateSession, groupController.joinGroup);
router.post('/:id/leave', authenticateSession, groupController.leaveGroup);
router.delete('/:id/members/:userId', authenticateSession, groupController.removeMember);
router.post('/:id/ban', authenticateSession, groupController.banMember);

// Маршруты для управления администраторами
router.post('/:id/admins', authenticateSession, groupController.addAdmin);
router.delete('/:id/admins', authenticateSession, groupController.removeAdmin);

router.get('/user/:userId/admin', authenticateSession, groupController.getUserAdminGroups);

// Добавим новые эндпоинты для получения медиа-контента группы
router.get('/:id/media/photos', groupController.getGroupPhotos);
router.get('/:id/media/albums', groupController.getGroupAlbums);
router.get('/:id/media/tracks', groupController.getGroupTracks);
router.get('/:id/media/music-albums', groupController.getGroupMusicAlbums);

export default router; 