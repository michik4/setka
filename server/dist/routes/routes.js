"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeRoutes = void 0;
const express_1 = require("express");
const post_routes_1 = __importDefault(require("./post.routes"));
const user_routes_1 = __importDefault(require("./user.routes"));
const chat_routes_1 = __importDefault(require("./chat.routes"));
const auth_routes_1 = __importDefault(require("./auth.routes"));
const photo_routes_1 = __importDefault(require("./photo.routes"));
const wall_routes_1 = __importDefault(require("./wall.routes"));
const album_routes_1 = __importDefault(require("./album.routes"));
const music_routes_1 = __importDefault(require("./music.routes"));
const initializeRoutes = (app) => {
    const router = (0, express_1.Router)();
    // Логирование всех запросов к API
    router.use((req, res, next) => {
        console.log(`[API Router] Получен запрос: ${req.method} ${req.baseUrl}${req.path}`);
        next();
    });
    console.log('Инициализация маршрутов API...');
    // Подключаем все маршруты
    router.use('/posts', post_routes_1.default);
    console.log('Подключены маршруты постов:', post_routes_1.default.stack.map(r => { var _a; return (_a = r.route) === null || _a === void 0 ? void 0 : _a.path; }).filter(Boolean));
    router.use('/users', user_routes_1.default);
    console.log('Подключены маршруты пользователей');
    router.use('/chats', chat_routes_1.default);
    console.log('Подключены маршруты чатов');
    router.use('/auth', auth_routes_1.default);
    console.log('Подключены маршруты аутентификации');
    router.use('/photos', photo_routes_1.default);
    console.log('Подключены маршруты фотографий');
    router.use('/wall', wall_routes_1.default);
    console.log('Подключены маршруты стены');
    router.use('/albums', album_routes_1.default);
    console.log('Подключены маршруты альбомов');
    router.use('/music', music_routes_1.default);
    console.log('Подключены маршруты музыки');
    // Подключаем все маршруты под префиксом /api
    app.use('/api', router);
};
exports.initializeRoutes = initializeRoutes;
