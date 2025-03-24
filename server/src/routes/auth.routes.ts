import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticateSession } from '../middleware/auth.middleware';

const router = Router();
const authController = new AuthController();

// Публичные маршруты
router.post('/login', authController.login.bind(authController));

// Защищенные маршруты
router.post('/logout', authenticateSession, authController.logout.bind(authController));
router.get('/me', authenticateSession, authController.getCurrentUser.bind(authController));

export default router; 