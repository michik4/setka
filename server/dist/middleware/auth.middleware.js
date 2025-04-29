"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateSession = authenticateSession;
const user_service_1 = require("../services/user.service");
const session_service_1 = require("../services/session.service");
const userService = new user_service_1.UserService();
const sessionService = new session_service_1.SessionService();
async function authenticateSession(req, res, next) {
    var _a;
    console.log(`[Auth] ${req.method} ${req.path}`);
    console.log('[Auth] Cookies:', req.cookies);
    const sessionId = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a.session_id;
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
        req.user = user;
        next();
    }
    catch (error) {
        console.error('[Auth] Ошибка при аутентификации:', error);
        res.status(500).json({ message: 'Ошибка при аутентификации' });
    }
}
