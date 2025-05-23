"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const session_service_1 = require("../services/session.service");
const user_service_1 = require("../services/user.service");
const bcrypt_1 = __importDefault(require("bcrypt"));
const placeholder_1 = require("../utils/placeholder");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// JWT секретный ключ (в продакшене должен быть в .env)
const JWT_SECRET = 'your-secret-key-should-be-in-env-file';
const TOKEN_EXPIRES_IN = '30d'; // 30 дней
class AuthController {
    constructor() {
        this.register = async (req, res) => {
            var _a, _b;
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
                const session = await this.sessionService.createSession(user, (_a = req.ip) !== null && _a !== void 0 ? _a : 'unknown', (_b = req.headers['user-agent']) !== null && _b !== void 0 ? _b : 'unknown');
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
            }
            catch (error) {
                console.error('Ошибка при регистрации:', error);
                return res.status(500).json({ message: 'Ошибка сервера при регистрации' });
            }
        };
        this.login = async (req, res) => {
            var _a, _b;
            try {
                const { email, password } = req.body;
                if (!email || !password) {
                    return res.status(400).json({ message: 'Email и пароль обязательны' });
                }
                const user = await this.userService.getUserByEmail(email);
                if (!user) {
                    return res.status(401).json({ message: 'Неверный email или пароль' });
                }
                const isValidPassword = await bcrypt_1.default.compare(password, user.password);
                if (!isValidPassword) {
                    return res.status(401).json({ message: 'Неверный email или пароль' });
                }
                const session = await this.sessionService.createSession(user, (_a = req.ip) !== null && _a !== void 0 ? _a : 'unknown', (_b = req.headers['user-agent']) !== null && _b !== void 0 ? _b : 'unknown');
                // Генерируем JWT токен
                const token = this.generateToken(user.id, session.sessionId);
                // Проверяем, что токен сгенерирован
                console.log("[Auth Controller] Сгенерирован токен:", token ? "✓" : "✗");
                const responseData = {
                    token,
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    nickname: user.nickname
                };
                console.log("[Auth Controller] Отправляем ответ:", JSON.stringify(responseData));
                return res.json(responseData);
            }
            catch (error) {
                console.error('Ошибка при авторизации:', error);
                return res.status(500).json({ message: 'Ошибка сервера при авторизации' });
            }
        };
        this.logout = async (req, res) => {
            try {
                // Получаем sessionId из JWT токена (req.user устанавливается в middleware)
                if (req.sessionId) {
                    await this.sessionService.deactivateSession(req.sessionId);
                    // Очищаем временные файлы
                    await placeholder_1.PhotoPlaceholder.cleanupTempFiles();
                }
                return res.json({ message: 'Успешный выход' });
            }
            catch (error) {
                console.error('Ошибка при выходе:', error);
                return res.status(500).json({ message: 'Ошибка сервера при выходе' });
            }
        };
        this.logoutAll = async (req, res) => {
            try {
                if (!req.user) {
                    return res.status(401).json({ message: 'Не авторизован' });
                }
                const userId = req.user.id;
                await this.sessionService.deactivateAllUserSessions(userId);
                // Очищаем временные файлы
                await placeholder_1.PhotoPlaceholder.cleanupTempFiles();
                return res.json({ message: 'Успешный выход со всех устройств' });
            }
            catch (error) {
                console.error('Ошибка при выходе со всех устройств:', error);
                return res.status(500).json({ message: 'Ошибка сервера при выходе со всех устройств' });
            }
        };
        this.getSessions = async (req, res) => {
            try {
                if (!req.user) {
                    return res.status(401).json({ message: 'Не авторизован' });
                }
                const userId = req.user.id;
                const sessions = await this.sessionService.getActiveSessionsByUserId(userId);
                return res.json(sessions);
            }
            catch (error) {
                console.error('Ошибка при получении сессий:', error);
                return res.status(500).json({ message: 'Ошибка сервера при получении сессий' });
            }
        };
        this.getCurrentUser = async (req, res) => {
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
            }
            catch (error) {
                console.error('Ошибка при получении текущего пользователя:', error);
                res.status(500).json({ message: 'Ошибка сервера' });
            }
        };
        // Обновление токена
        this.refreshToken = async (req, res) => {
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
            }
            catch (error) {
                console.error('Ошибка при обновлении токена:', error);
                return res.status(500).json({ message: 'Ошибка сервера при обновлении токена' });
            }
        };
        // Новый метод для очистки временных файлов
        this.cleanupTemp = async (req, res) => {
            try {
                await placeholder_1.PhotoPlaceholder.cleanupTempFiles();
                return res.json({ message: 'Временные файлы очищены' });
            }
            catch (error) {
                console.error('Ошибка при очистке временных файлов:', error);
                return res.status(500).json({ message: 'Ошибка при очистке временных файлов' });
            }
        };
        this.userService = new user_service_1.UserService();
        this.sessionService = new session_service_1.SessionService();
    }
    // Генерация JWT токена
    generateToken(userId, sessionId) {
        const token = jsonwebtoken_1.default.sign({
            userId,
            sessionId
        }, JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });
        console.log("[Auth Controller] Генерация токена для пользователя:", userId, "сессия:", sessionId);
        return token;
    }
}
exports.AuthController = AuthController;
