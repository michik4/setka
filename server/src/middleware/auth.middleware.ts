import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { SessionService } from '../services/session.service';
import { AppDataSource } from '../db/db_connect';
import { User } from '../entities/user.entity';
import { Photo } from '../entities/photo.entity';
import { AuthenticatedRequest } from '../types/auth.types';

const userService = new UserService(
    AppDataSource.getRepository(User),
    AppDataSource.getRepository(Photo)
);
const sessionService = new SessionService();

export { AuthenticatedRequest };

export async function authenticateSession(
    req: Request,
    res: Response,
    next: NextFunction
) {
    console.log(`[Auth] ${req.method} ${req.path}`);
    console.log('[Auth] Cookies:', req.cookies);

    const sessionId = req.cookies?.session_id;
    if (!sessionId) {
        console.log('[Auth] Сессия не найдена в cookies');
        return res.status(401).json({ message: 'Требуется аутентификация' });
    }

    try {
        console.log('[Auth] Проверка сессии:', sessionId);
        const session = await sessionService.validateSession(sessionId);
        
        if (!session || !session.isActive) {
            console.log('[Auth] Сессия неактивна или не найдена');
            return res.status(401).json({ message: 'Недействительная сессия' });
        }

        console.log('[Auth] Получение пользователя:', session.userId);
        const user = await userService.getUserById(session.userId);
        
        if (!user) {
            console.log('[Auth] Пользователь не найден');
            return res.status(401).json({ message: 'Пользователь не найден' });
        }

        console.log('[Auth] Пользователь аутентифицирован:', user.id);
        (req as AuthenticatedRequest).user = user;
        next();
    } catch (error) {
        console.error('[Auth] Ошибка при аутентификации:', error);
        res.status(500).json({ message: 'Ошибка при аутентификации' });
    }
} 