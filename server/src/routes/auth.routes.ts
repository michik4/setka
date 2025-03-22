import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticateSession } from '../middleware/auth.middleware';

const router = Router();
const authController = new AuthController();

// Публичные маршруты
router.post('/login', authController.login);

// Защищенные маршруты (требуют аутентификации)
router.post('/logout', authenticateSession, authController.logout);
router.post('/logout/all', authenticateSession, authController.logoutAll);
router.get('/sessions', authenticateSession, authController.getSessions);

export default router; 