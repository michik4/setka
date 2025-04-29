import express, { Request, Response, NextFunction } from 'express';
import { authenticateSession, AuthenticatedRequest } from '../middleware/auth.middleware';
import { FriendController } from '../controllers/friend.controller';

const router = express.Router();

// Middleware для приведения типов
const handleRequest = (handler: (req: AuthenticatedRequest, res: Response) => Promise<any>) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await handler(req as AuthenticatedRequest, res);
        } catch (error) {
            next(error);
        }
    };
};

// Получить входящие запросы в друзья - более специфичный маршрут должен идти перед маршрутами с параметрами
router.get('/requests', authenticateSession, handleRequest(FriendController.getIncomingFriendRequests));

// Маршруты для запросов дружбы - более специфичные
router.post('/request/:userId', authenticateSession, handleRequest(FriendController.sendFriendRequest));
router.post('/accept/:userId', authenticateSession, handleRequest(FriendController.acceptFriendRequest));
router.post('/reject/:userId', authenticateSession, handleRequest(FriendController.rejectFriendRequest));

// Получить статус дружбы - специфичный маршрут
router.get('/status/:userId', authenticateSession, handleRequest(FriendController.getFriendshipStatus));

// Общие маршруты с параметрами
router.get('/:userId', authenticateSession, handleRequest(FriendController.getFriends));
router.delete('/:userId', authenticateSession, handleRequest(FriendController.removeFriend));

export default router; 