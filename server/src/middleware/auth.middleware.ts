import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { SessionService } from '../services/session.service';
import { AppDataSource } from '../db/db_connect';
import { User } from '../entities/user.entity';
import { Photo } from '../entities/photo.entity';
import { AuthenticatedRequest, AuthRequest } from '../types/auth.types';
import jwt from 'jsonwebtoken';

const userService = new UserService();
const sessionService = new SessionService();

// JWT секретный ключ (должен совпадать с ключом в AuthController)
const JWT_SECRET = 'your-secret-key-should-be-in-env-file';

export { AuthenticatedRequest };

export async function authenticateSession(
    req: Request,
    res: Response,
    next: NextFunction
) {
    console.log(`[Auth] ${req.method} ${req.path}`);
    
    // Получаем токен из заголовка Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('[Auth] Токен не найден в заголовке Authorization');
        return res.status(401).json({ message: 'Требуется аутентификация' });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
        // Верифицируем JWT токен
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number, sessionId: string };
        const { userId, sessionId } = decoded;
        
        console.log('[Auth] Проверка сессии:', sessionId);
        const session = await sessionService.validateSession(sessionId);
        
        if (!session || !session.isActive) {
            console.log('[Auth] Сессия неактивна или не найдена');
            return res.status(401).json({ message: 'Недействительная сессия' });
        }

        console.log('[Auth] Получение пользователя:', userId);
        const user = await userService.getUserById(userId);
        
        if (!user) {
            console.log('[Auth] Пользователь не найден');
            return res.status(401).json({ message: 'Пользователь не найден' });
        }

        console.log('[Auth] Пользователь аутентифицирован:', user.id);
        const authReq = req as AuthRequest;
        authReq.user = user;
        authReq.sessionId = sessionId;
        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            console.error('[Auth] Ошибка в JWT токене:', error.message);
            return res.status(401).json({ message: 'Недействительный токен' });
        } else if (error instanceof jwt.TokenExpiredError) {
            console.error('[Auth] Срок действия токена истек');
            return res.status(401).json({ message: 'Срок действия токена истек' });
        }
        
        console.error('[Auth] Ошибка при аутентификации:', error);
        res.status(500).json({ message: 'Ошибка при аутентификации' });
    }
} 