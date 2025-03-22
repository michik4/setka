import { Request, Response, NextFunction } from 'express';
import { SessionService } from '../services/session.service';
import { UserService } from '../services/user.service';

const sessionService = new SessionService();
const userService = new UserService();

export interface AuthRequest extends Request {
    user?: any;
    session?: any;
}

export const authenticateSession = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const sessionId = req.cookies['session_id'];
        
        if (!sessionId) {
            return res.status(401).json({ message: 'Не авторизован' });
        }

        const session = await sessionService.validateSession(sessionId);
        
        if (!session) {
            res.clearCookie('session_id');
            return res.status(401).json({ message: 'Сессия недействительна' });
        }

        const user = await userService.getUserById(session.userId);
        
        if (!user) {
            res.clearCookie('session_id');
            return res.status(401).json({ message: 'Пользователь не найден' });
        }

        req.user = user;
        req.session = session;
        next();
    } catch (error) {
        console.error('Ошибка аутентификации:', error);
        res.status(500).json({ message: 'Ошибка сервера при аутентификации' });
    }
}; 