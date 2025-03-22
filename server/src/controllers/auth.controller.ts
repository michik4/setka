import { Request, Response } from 'express';
import { SessionService } from '../services/session.service';
import { UserService } from '../services/user.service';
import { AuthRequest } from '../middleware/auth.middleware';
import bcrypt from 'bcrypt';

export class AuthController {
    private sessionService: SessionService;
    private userService: UserService;

    constructor() {
        this.sessionService = new SessionService();
        this.userService = new UserService();
    }

    login = async (req: Request, res: Response) => {
        try {
            const { email, password } = req.body;

            const user = await this.userService.getUserByEmail(email);
            if (!user) {
                return res.status(401).json({ message: 'Неверный email или пароль' });
            }

            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return res.status(401).json({ message: 'Неверный email или пароль' });
            }

            const session = await this.sessionService.createSession(
                user,
                req.ip ?? 'unknown',
                req.headers['user-agent'] ?? 'unknown'
            );

            res.cookie('session_id', session.sessionId, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 30 * 24 * 60 * 60 * 1000 // 30 дней
            });

            return res.json({
                message: 'Успешная авторизация',
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName
                }
            });
        } catch (error) {
            console.error('Ошибка при авторизации:', error);
            return res.status(500).json({ message: 'Ошибка сервера при авторизации' });
        }
    };

    logout = async (req: AuthRequest, res: Response) => {
        try {
            const sessionId = req.cookies['session_id'];
            if (sessionId) {
                await this.sessionService.deactivateSession(sessionId);
                res.clearCookie('session_id');
            }
            return res.json({ message: 'Успешный выход' });
        } catch (error) {
            console.error('Ошибка при выходе:', error);
            return res.status(500).json({ message: 'Ошибка сервера при выходе' });
        }
    };

    logoutAll = async (req: AuthRequest, res: Response) => {
        try {
            const userId = req.user.id;
            await this.sessionService.deactivateAllUserSessions(userId);
            res.clearCookie('session_id');
            return res.json({ message: 'Успешный выход со всех устройств' });
        } catch (error) {
            console.error('Ошибка при выходе со всех устройств:', error);
            return res.status(500).json({ message: 'Ошибка сервера при выходе со всех устройств' });
        }
    };

    getSessions = async (req: AuthRequest, res: Response) => {
        try {
            const userId = req.user.id;
            const sessions = await this.sessionService.getActiveSessionsByUserId(userId);
            return res.json(sessions);
        } catch (error) {
            console.error('Ошибка при получении сессий:', error);
            return res.status(500).json({ message: 'Ошибка сервера при получении сессий' });
        }
    };
} 