import { Request, Response } from 'express';
import { SessionService } from '../services/session.service';
import { UserService } from '../services/user.service';
import { AuthRequest } from '../types/auth.types';
import bcrypt from 'bcrypt';
import { AppDataSource } from '../db/db_connect';
import { User } from '../entities/user.entity';
import { Photo } from '../entities/photo.entity';
import { PhotoPlaceholder } from '../utils/placeholder';
import jwt from 'jsonwebtoken';

// JWT секретный ключ (в продакшене должен быть в .env)
const JWT_SECRET = 'your-secret-key-should-be-in-env-file';
const TOKEN_EXPIRES_IN = '30d'; // 30 дней

export class AuthController {
    private userService: UserService;
    private sessionService: SessionService;

    constructor() {
        this.userService = new UserService();
        this.sessionService = new SessionService();
    }

    // Генерация JWT токена
    private generateToken(userId: number, sessionId: string): string {
        return jwt.sign(
            { 
                userId, 
                sessionId 
            },
            JWT_SECRET,
            { expiresIn: TOKEN_EXPIRES_IN }
        );
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

            // Генерируем JWT токен
            const token = this.generateToken(user.id, session.sessionId);

            return res.status(201).json({
                message: 'Регистрация успешна',
                token,
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

            // Генерируем JWT токен
            const token = this.generateToken(user.id, session.sessionId);

            return res.json({
                token,
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
            // Получаем sessionId из JWT токена (req.user устанавливается в middleware)
            if (req.sessionId) {
                await this.sessionService.deactivateSession(req.sessionId);
                // Очищаем временные файлы
                await PhotoPlaceholder.cleanupTempFiles();
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

    // Обновление токена
    refreshToken = async (req: AuthRequest, res: Response) => {
        try {
            if (!req.user || !req.sessionId) {
                return res.status(401).json({ message: 'Не авторизован' });
            }
            
            // Проверяем активность сессии
            const session = await this.sessionService.validateSession(req.sessionId);
            if (!session) {
                return res.status(401).json({ message: 'Недействительная сессия' });
            }
            
            // Генерируем новый токен
            const token = this.generateToken(req.user.id, req.sessionId);
            
            return res.json({ token });
        } catch (error) {
            console.error('Ошибка при обновлении токена:', error);
            return res.status(500).json({ message: 'Ошибка сервера при обновлении токена' });
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