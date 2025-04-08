"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const db_connect_1 = require("./db/db_connect");
const routes_1 = require("./routes/routes");
const WebSocket_service_1 = require("./services/WebSocket.service");
const path_1 = __importDefault(require("path"));
const config_1 = require("./config");
dotenv_1.default.config();
console.log('Загружены переменные окружения');
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
// Middleware
app.use((0, cors_1.default)({
    origin: config_1.config.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Cookie', 'Set-Cookie'],
    exposedHeaders: ['Set-Cookie']
}));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
// Добавляем логирование всех запросов
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    console.log('Base URL:', req.baseUrl);
    console.log('Original URL:', req.originalUrl);
    next();
});
console.log('Настроены middleware');
// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('Ошибка:', err);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
});
const startServer = async () => {
    try {
        console.log('Начинаем подключение к базе данных...');
        // Подключение к базе данных
        await db_connect_1.AppDataSource.initialize();
        console.log('Подключено к PostgreSQL');
        console.log('Инициализируем WebSocket...');
        // Инициализация WebSocket
        const wsService = new WebSocket_service_1.WebSocketService(server);
        console.log('WebSocket инициализирован');
        // Инициализация маршрутов API
        console.log('Инициализируем маршруты API...');
        (0, routes_1.initializeRoutes)(app);
        console.log('Маршруты API инициализированы');
        // Настройка статических файлов (должно быть после инициализации API-маршрутов)
        const uploadsPath = path_1.default.join(__dirname, '..', 'uploads');
        // Функция для добавления CORS заголовков
        const addCorsHeaders = (res, path, stat) => {
            res.set('Access-Control-Allow-Origin', '*');
            res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
            res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
            res.set('Cross-Origin-Resource-Policy', 'cross-origin');
            // Для аудиофайлов установим правильный MIME тип
            if (path.endsWith('.mp3')) {
                res.set('Content-Type', 'audio/mpeg');
            }
            else if (path.endsWith('.wav') || path.endsWith('.wave')) {
                res.set('Content-Type', 'audio/wav');
            }
            else if (path.endsWith('.ogg')) {
                res.set('Content-Type', 'audio/ogg');
            }
        };
        // Опции для статических файлов
        const staticOptions = {
            setHeaders: addCorsHeaders
        };
        // ВАЖНО: Сначала настраиваем маршрут для аудиофайлов, затем общие статические маршруты
        // Отдельный обработчик для аудиофайлов реализован в контроллере /api/music/file/:filename
        console.log('Настроен специальный обработчик для аудиофайлов через контроллер: /api/music/file/:filename');
        // Затем настраиваем остальные статические пути
        app.use('/uploads', express_1.default.static(uploadsPath, staticOptions)); // оставляем для обратной совместимости
        app.use('/api/uploads', express_1.default.static(uploadsPath, staticOptions));
        app.use('/api/photos', express_1.default.static(path_1.default.join(uploadsPath, 'photos'), staticOptions));
        app.use('/api/temp', express_1.default.static(path_1.default.join(uploadsPath, 'temp'), staticOptions));
        // Статический маршрут для музыки как запасной вариант для обратной совместимости
        app.use('/api/media/music', express_1.default.static(path_1.default.join(uploadsPath, 'music'), staticOptions));
        console.log('Настроена раздача статических файлов из:', uploadsPath);
        const PORT = process.env.PORT || 3000;
        server.listen(PORT, () => {
            console.log(`Сервер запущен на порту ${PORT}`);
            console.log(`WebSocket сервер доступен на ws://localhost:${PORT}`);
            console.log(`REST API доступен на http://localhost:${PORT}`);
            console.log(`CORS разрешен для ${config_1.config.CLIENT_URL}`);
        });
    }
    catch (error) {
        console.error('Ошибка при запуске сервера:', error);
        process.exit(1);
    }
};
startServer();
