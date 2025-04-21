import { Request, Response } from 'express';
import { SessionService } from '../services/session.service';
import { UserService } from '../services/user.service';
import { AuthRequest } from '../types/auth.types';
import bcrypt from 'bcrypt';
import { AppDataSource } from '../db/db_connect';
import { User } from '../entities/user.entity';
import { Photo } from '../entities/photo.entity';
import { PhotoPlaceholder } from '../utils/placeholder';

export class AuthController {
    private userService: UserService;
    private sessionService: SessionService;

    constructor() {
        this.userService = new UserService();
        this.sessionService = new SessionService();
    }

    register = async (req: Request, res: Response) => {
        try {
            const { email, password, firstName, lastName } = req.body;

            // Проверяем, существует ли пользователь с таким email
            const existingUser = await this.userService.getUserByEmail(email);
            if (existingUser) {
                return res.status(400).json({ message: 'Пользователь с таким email уже существует' });
            }

            // Создаем нового пользователя
            const user = await this.userService.createUser({
                email,
                password,
                firstName,
                lastName,
                nickname: email.split('@')[0], // Временный никнейм из email
                photos: [],
                posts: []
            });

            // Создаем сессию для нового пользователя
            const session = await this.sessionService.createSession(
                user,
                req.ip ?? 'unknown',
                req.headers['user-agent'] ?? 'unknown'
            );

            // Устанавливаем cookie с идентификатором сессии
            res.cookie('session_id', session.sessionId, {
                httpOnly: true,
                secure: true,
                sameSite: 'none',
                maxAge: 30 * 24 * 60 * 60 * 1000, // 30 дней
                path: '/'
            });

            return res.status(201).json({
                message: 'Регистрация успешна',
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName
                }
            });
        } catch (error) {
            console.error('Ошибка при регистрации:', error);
            return res.status(500).json({ message: 'Ошибка сервера при регистрации' });
        }
    };

    login = async (req: Request, res: Response) => {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({ message: 'Email и пароль обязательны' });
            }

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
                secure: true,
                sameSite: 'none',
                maxAge: 30 * 24 * 60 * 60 * 1000, // 30 дней
                path: '/'
            });

            return res.json({
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                nickname: user.nickname
            });
        } catch (error) {
            console.error('Ошибка при авторизации:', error);
            return res.status(500).json({ message: 'Ошибка сервера при авторизации' });
        }
    };

    logout = async (req: AuthRequest, res: Response) => {
        try {
            const sessionId = req.cookies?.session_id;
            if (sessionId) {
                await this.sessionService.deactivateSession(sessionId);
                // Очищаем временные файлы
                await PhotoPlaceholder.cleanupTempFiles();
                res.clearCookie('session_id', {
                    httpOnly: true,
                    secure: true,
                    sameSite: 'none',
                    path: '/'
                });
            }
            return res.json({ message: 'Успешный выход' });
        } catch (error) {
            console.error('Ошибка при выходе:', error);
            return res.status(500).json({ message: 'Ошибка сервера при выходе' });
        }
    };

    logoutAll = async (req: AuthRequest, res: Response) => {
        try {
            if (!req.user) {
                return res.status(401).json({ message: 'Не авторизован' });
            }
            const userId = req.user.id;
            await this.sessionService.deactivateAllUserSessions(userId);
            // Очищаем временные файлы
            await PhotoPlaceholder.cleanupTempFiles();
            res.clearCookie('session_id', {
                httpOnly: true,
                secure: true,
                sameSite: 'none',
                path: '/'
            });
            return res.json({ message: 'Успешный выход со всех устройств' });
        } catch (error) {
            console.error('Ошибка при выходе со всех устройств:', error);
            return res.status(500).json({ message: 'Ошибка сервера при выходе со всех устройств' });
        }
    };

    getSessions = async (req: AuthRequest, res: Response) => {
        try {
            if (!req.user) {
                return res.status(401).json({ message: 'Не авторизован' });
            }
            const userId = req.user.id;
            const sessions = await this.sessionService.getActiveSessionsByUserId(userId);
            return res.json(sessions);
        } catch (error) {
            console.error('Ошибка при получении сессий:', error);
            return res.status(500).json({ message: 'Ошибка сервера при получении сессий' });
        }
    };

    getCurrentUser = async (req: AuthRequest, res: Response) => {
        try {
            if (!req.user) {
                return res.status(401).json({ message: 'Пользователь не аутентифицирован' });
            }

            const user = await this.userService.getUserById(req.user.id);
            if (!user) {
                return res.status(404).json({ message: 'Пользователь не найден' });
            }

            res.json({
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                nickname: user.nickname
            });
        } catch (error) {
            console.error('Ошибка при получении текущего пользователя:', error);
            res.status(500).json({ message: 'Ошибка сервера' });
        }
    };

    // Новый метод для очистки временных файлов
    cleanupTemp = async (req: AuthRequest, res: Response) => {
        try {
            await PhotoPlaceholder.cleanupTempFiles();
            return res.json({ message: 'Временные файлы очищены' });
        } catch (error) {
            console.error('Ошибка при очистке временных файлов:', error);
            return res.status(500).json({ message: 'Ошибка при очистке временных файлов' });
        }
    };
} 