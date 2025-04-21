import { Router } from 'express';
import { GroupController } from '../controllers/group.controller';
import { authenticateSession } from '../middleware/auth.middleware';

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

// Маршруты для создания и управления группой
router.post('/', authenticateSession, groupController.createGroup);
router.put('/:id', authenticateSession, groupController.updateGroup);
router.delete('/:id', authenticateSession, groupController.deleteGroup);

// Маршруты для членства в группе
router.post('/:id/join', authenticateSession, groupController.joinGroup);
router.post('/:id/leave', authenticateSession, groupController.leaveGroup);

// Маршруты для управления администраторами
router.post('/:id/admins', authenticateSession, groupController.addAdmin);
router.delete('/:id/admins', authenticateSession, groupController.removeAdmin);

export default router; 