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
const fs_1 = __importDefault(require("fs"));
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
    console.log('\n======================================================================');
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Base URL:', req.baseUrl);
    console.log('Original URL:', req.originalUrl);
    // Логируем body для запросов, которые его содержат
    if (req.method !== 'GET' && req.body) {
        console.log('Request Body:', JSON.stringify(req.body, null, 2));
        // Проверяем содержимое полей, связанных с треками
        if (req.body.trackIds) {
            console.log('TrackIds в запросе:', req.body.trackIds, typeof req.body.trackIds);
            if (typeof req.body.trackIds === 'string') {
                try {
                    const parsed = JSON.parse(req.body.trackIds);
                    console.log('Распарсенные trackIds:', parsed);
                }
                catch (e) {
                    console.log('Не удалось распарсить trackIds');
                }
            }
        }
        if (req.body.trackId) {
            console.log('TrackId в запросе:', req.body.trackId, typeof req.body.trackId);
        }
    }
    // Перехватываем метод send для логирования ответов
    const originalSend = res.send;
    res.send = function (body) {
        console.log(`[RESPONSE] Status: ${res.statusCode}`);
        // Логируем тело ответа, только если это не успешный ответ (чтобы не логировать большие данные)
        if (res.statusCode < 200 || res.statusCode >= 400) {
            try {
                console.log('Response Body:', typeof body === 'string' ? body : JSON.stringify(body, null, 2));
            }
            catch (e) {
                console.log('Response Body: [Cannot stringify]');
            }
        }
        console.log('======================================================================\n');
        return originalSend.call(this, body);
    };
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
        // Настраиваем отдачу React-приложения из папки public
        const publicPath = path_1.default.join(__dirname, '..', 'public');
        console.log('Настраиваем отдачу React-приложения из:', publicPath);
        // Проверяем, существует ли папка
        if (fs_1.default.existsSync(publicPath)) {
            console.log('Папка public существует, настраиваем статические маршруты');
            // Статические файлы из папки public
            app.use(express_1.default.static(publicPath));
            // Все остальные GET запросы не к API направляем на index.html
            app.get('*', (req, res, next) => {
                // Исключаем запросы к API
                if (!req.path.startsWith('/api/')) {
                    console.log(`[SPA] Запрос к ${req.path} направлен на index.html`);
                    res.sendFile(path_1.default.join(publicPath, 'index.html'));
                }
                else {
                    next();
                }
            });
        }
        else {
            console.warn('Папка public не существует! React-приложение не будет доступно. Создайте папку и скопируйте туда файлы сборки.');
        }
        const PORT = process.env.PORT || 3000;
        // Изменяем адрес с умолчания на 0.0.0.0 (все IP)
        const HOST = config_1.config.HOST;
        server.listen(Number(PORT), HOST, () => {
            console.log(`Сервер запущен на ${HOST}:${PORT}`);
            console.log(`WebSocket сервер доступен на ws://${HOST === '0.0.0.0' ? 'IP-адрес-сервера' : HOST}:${PORT}`);
            console.log(`REST API доступен на http://${HOST === '0.0.0.0' ? 'IP-адрес-сервера' : HOST}:${PORT}`);
            console.log(`CORS разрешен для ${config_1.config.CLIENT_URL}`);
        });
    }
    catch (error) {
        console.error('Ошибка при запуске сервера:', error);
        process.exit(1);
    }
};
startServer();
