"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketService = void 0;
const socket_io_1 = require("socket.io");
const user_service_1 = require("./user.service");
const bcrypt_1 = __importDefault(require("bcrypt"));
const bcrypt_2 = require("bcrypt");
const db_connect_1 = require("../db/db_connect");
const user_entity_1 = require("../entities/user.entity");
const photo_entity_1 = require("../entities/photo.entity");
const placeholder_1 = require("../utils/placeholder");
class WebSocketService {
    constructor(server) {
        this.userSockets = new Map(); // userId -> socketId
        this.io = new socket_io_1.Server(server, {
            cors: {
                origin: process.env.CLIENT_URL || 'https://blue-bikes-happen.loca.lt',
                methods: ['GET', 'POST'],
                credentials: true
            },
            transports: ['websocket'],
            allowUpgrades: false,
            pingTimeout: 10000,
            pingInterval: 5000,
            connectTimeout: 10000,
            allowEIO3: true,
            cookie: {
                name: 'io',
                httpOnly: true,
                path: '/',
                sameSite: 'lax'
            }
        });
        this.io.engine.on("connection_error", (err) => {
            console.error('Ошибка подключения к WebSocket:', err);
            console.error('Детали ошибки:', {
                type: err.type,
                description: err.description,
                context: err.context
            });
        });
        this.io.engine.on("connection", (socket) => {
            console.log('Новое подключение:', socket.id);
            console.log('Используемый транспорт:', socket.transport.name);
        });
        this.io.engine.on("initial_headers", (headers, req) => {
            console.log('Начальные заголовки:', headers);
            console.log('URL запроса:', req.url);
            console.log('Метод запроса:', req.method);
        });
        this.userService = new user_service_1.UserService(db_connect_1.AppDataSource.getRepository(user_entity_1.User), db_connect_1.AppDataSource.getRepository(photo_entity_1.Photo));
        this.setupSocketHandlers();
    }
    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log('Новое подключение:', socket.id);
            console.log('Текущий транспорт:', socket.conn.transport.name);
            socket.onAny((event, ...args) => {
                console.log(`Получено событие ${event}:`, args);
            });
            // Обработка аутентификации
            socket.on('auth', async (userId) => {
                try {
                    console.log('Получен запрос на аутентификацию для пользователя:', userId);
                    // Проверяем, не аутентифицирован ли уже этот сокет
                    const existingSocketId = this.userSockets.get(userId.toString());
                    if (existingSocketId === socket.id) {
                        console.log('Сокет уже аутентифицирован для пользователя:', userId);
                        return;
                    }
                    const user = await this.userService.getUserById(userId);
                    if (!user) {
                        console.log('Пользователь не найден:', userId);
                        socket.emit('auth_error', { message: 'Пользователь не найден' });
                        return;
                    }
                    // Сохраняем связь socket -> user
                    this.userSockets.set(userId.toString(), socket.id);
                    socket.join(`user_${userId}`);
                    console.log('Пользователь успешно аутентифицирован:', userId);
                    socket.emit('auth_success', {
                        user: {
                            id: user.id,
                            firstName: user.firstName,
                            lastName: user.lastName,
                            email: user.email
                        }
                    });
                }
                catch (error) {
                    console.error('Ошибка при аутентификации:', error);
                    socket.emit('auth_error', { message: 'Ошибка при аутентификации' });
                }
            });
            // Регистрация пользователя
            socket.on('register', async (data) => {
                console.log('Получен запрос на регистрацию:', { ...data, password: '***' });
                try {
                    const { firstName, lastName, email, password } = data;
                    // Проверяем, существует ли пользователь
                    console.log('Проверяем существующего пользователя с email:', email);
                    const existingUser = await this.userService.getUserByEmail(email);
                    if (existingUser) {
                        console.log('Пользователь уже существует:', email);
                        socket.emit('auth_error', { message: 'Пользователь с таким email уже существует' });
                        return;
                    }
                    // Создаем нового пользователя
                    console.log('Создаем нового пользователя:', email);
                    const hashedPassword = await bcrypt_1.default.hash(password, 10);
                    const user = await this.userService.createUser({
                        firstName,
                        lastName,
                        email,
                        password: hashedPassword,
                        nickname: `${firstName.toLowerCase()}${Math.floor(Math.random() * 1000)}`,
                        photos: [],
                        posts: []
                    });
                    console.log('Пользователь успешно создан:', user.id);
                    // Сохраняем связь socket -> user
                    this.userSockets.set(user.id.toString(), socket.id);
                    socket.join(`user_${user.id}`);
                    // Отправляем успешный ответ
                    console.log('Отправляем успешный ответ');
                    socket.emit('auth_success', {
                        user: {
                            id: user.id,
                            firstName: user.firstName,
                            lastName: user.lastName,
                            email: user.email
                        }
                    });
                }
                catch (error) {
                    console.error('Ошибка при регистрации:', error);
                    socket.emit('auth_error', { message: 'Ошибка при регистрации пользователя' });
                }
            });
            // Аутентификация пользователя
            socket.on('login', async (data) => {
                var _a;
                try {
                    console.log('Получен запрос на вход:', { email: data.email });
                    if (!data.email || !data.password) {
                        console.log('Отсутствуют email или пароль');
                        socket.emit('auth_error', { message: 'Email и пароль обязательны' });
                        return;
                    }
                    const { email, password } = data;
                    // Ищем пользователя
                    console.log('Ищем пользователя с email:', email);
                    const user = await this.userService.getUserByEmail(email);
                    if (!user) {
                        console.log('Пользователь не найден:', email);
                        socket.emit('auth_error', { message: 'Неверный email или пароль' });
                        return;
                    }
                    console.log('Пользователь найден:', {
                        id: user.id,
                        email: user.email,
                        hasPassword: !!user.password,
                        passwordLength: (_a = user.password) === null || _a === void 0 ? void 0 : _a.length
                    });
                    if (!user.password) {
                        console.error('У пользователя отсутствует хеш пароля:', email);
                        socket.emit('auth_error', { message: 'Ошибка аутентификации' });
                        return;
                    }
                    // Проверяем пароль
                    console.log('Проверяем пароль для пользователя:', email);
                    try {
                        console.log('Сравниваем пароли:', {
                            providedPasswordLength: password.length,
                            hashedPasswordLength: user.password.length
                        });
                        const isValidPassword = await (0, bcrypt_2.compare)(password, user.password);
                        console.log('Результат проверки пароля:', isValidPassword);
                        if (!isValidPassword) {
                            console.log('Неверный пароль для пользователя:', email);
                            socket.emit('auth_error', { message: 'Неверный email или пароль' });
                            return;
                        }
                    }
                    catch (bcryptError) {
                        console.error('Ошибка при проверке пароля:', bcryptError);
                        socket.emit('auth_error', { message: 'Ошибка при проверке пароля' });
                        return;
                    }
                    console.log('Пароль верный, выполняем вход для пользователя:', email);
                    // Сохраняем связь socket -> user
                    this.userSockets.set(user.id.toString(), socket.id);
                    socket.join(`user_${user.id}`);
                    // Отправляем успешный ответ
                    const response = {
                        user: {
                            id: user.id,
                            firstName: user.firstName,
                            lastName: user.lastName,
                            email: user.email
                        }
                    };
                    console.log('Отправляем успешный ответ:', response);
                    socket.emit('auth_success', response);
                }
                catch (error) {
                    console.error('Ошибка при входе:', error);
                    socket.emit('auth_error', { message: 'Ошибка при входе в систему' });
                }
            });
            // Проверка аутентификации
            socket.on('check_auth', async (userId) => {
                try {
                    if (!userId) {
                        socket.emit('auth_error', { message: 'Пользователь не аутентифицирован' });
                        return;
                    }
                    const user = await this.userService.getUserById(parseInt(userId));
                    if (!user) {
                        socket.emit('auth_error', { message: 'Пользователь не найден' });
                        return;
                    }
                    // Обновляем связь socket -> user
                    this.userSockets.set(userId, socket.id);
                    socket.join(`user_${userId}`);
                    socket.emit('auth_success', {
                        user: {
                            id: user.id,
                            firstName: user.firstName,
                            lastName: user.lastName,
                            email: user.email
                        }
                    });
                }
                catch (error) {
                    console.error('Ошибка при проверке аутентификации:', error);
                    socket.emit('auth_error', { message: 'Ошибка при проверке аутентификации' });
                }
            });
            // Выход из системы
            socket.on('logout', () => {
                const userId = this.findUserIdBySocketId(socket.id);
                if (userId) {
                    this.userSockets.delete(userId);
                    socket.leave(`user_${userId}`);
                }
                socket.emit('logout_success');
            });
            // Присоединение к чату
            socket.on('join_chat', (chatId) => {
                socket.join(`chat_${chatId}`);
                console.log(`Сокет ${socket.id} присоединился к чату ${chatId}`);
            });
            // Обработка нового сообщения
            socket.on('new_message', (data) => {
                this.io.to(`chat_${data.chatId}`).emit('message_received', data.message);
            });
            // Печатает
            socket.on('typing', (data) => {
                socket.to(`chat_${data.chatId}`).emit('user_typing', data.userId);
            });
            // Отключение
            socket.on('disconnect', async () => {
                const userId = this.findUserIdBySocketId(socket.id);
                if (userId) {
                    this.userSockets.delete(userId);
                    // Очищаем временные файлы при отключении
                    try {
                        await placeholder_1.PhotoPlaceholder.cleanupTempFiles();
                        console.log(`[WebSocket] Очищены временные файлы для пользователя ${userId}`);
                    }
                    catch (error) {
                        console.error('[WebSocket] Ошибка при очистке временных файлов:', error);
                    }
                }
                console.log('Клиент отключился:', socket.id);
            });
        });
    }
    findUserIdBySocketId(socketId) {
        for (const [userId, sid] of this.userSockets.entries()) {
            if (sid === socketId)
                return userId;
        }
        return undefined;
    }
    // Метод для отправки уведомления конкретному пользователю
    sendNotification(userId, notification) {
        const socketId = this.userSockets.get(userId);
        if (socketId) {
            this.io.to(socketId).emit('notification', notification);
        }
    }
    // Метод для отправки обновления всем подключенным клиентам
    broadcastUpdate(update) {
        this.io.emit('update', update);
    }
}
exports.WebSocketService = WebSocketService;
