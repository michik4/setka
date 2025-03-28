import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticateSession } from '../middleware/auth.middleware';

const router = Router();
const authController = new AuthController();

// Публичные маршруты
router.post('/login', authController.login.bind(authController));
router.post('/register', authController.register.bind(authController));

// Защищенные маршруты
router.post('/logout', authenticateSession, authController.logout.bind(authController));
router.post('/logout-all', authenticateSession, authController.logoutAll.bind(authController));
router.get('/sessions', authenticateSession, authController.getSessions.bind(authController));
router.get('/me', authenticateSession, authController.getCurrentUser.bind(authController));
router.post('/cleanup-temp', authenticateSession, authController.cleanupTemp.bind(authController));

export default router; 