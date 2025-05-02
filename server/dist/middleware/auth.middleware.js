"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateSession = authenticateSession;
const user_service_1 = require("../services/user.service");
const session_service_1 = require("../services/session.service");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const userService = new user_service_1.UserService();
const sessionService = new session_service_1.SessionService();
// JWT секретный ключ (должен совпадать с ключом в AuthController)
const JWT_SECRET = 'your-secret-key-should-be-in-env-file';
async function authenticateSession(req, res, next) {
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
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
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
        const authReq = req;
        authReq.user = user;
        authReq.sessionId = sessionId;
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            console.error('[Auth] Ошибка в JWT токене:', error.message);
            return res.status(401).json({ message: 'Недействительный токен' });
        }
        else if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            console.error('[Auth] Срок действия токена истек');
            return res.status(401).json({ message: 'Срок действия токена истек' });
        }
        console.error('[Auth] Ошибка при аутентификации:', error);
        res.status(500).json({ message: 'Ошибка при аутентификации' });
    }
}
