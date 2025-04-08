"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const post_controller_1 = require("../controllers/post.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
let postController = null;
// Инициализация контроллера
const initializeController = () => {
    if (!postController) {
        postController = new post_controller_1.PostController();
    }
    return postController;
};
// Логирование всех запросов к постам
router.use((req, res, next) => {
    console.log(`[Posts Route] Получен запрос: ${req.method} ${req.baseUrl}${req.path}`);
    console.log('Query:', req.query);
    console.log('Params:', req.params);
    next();
});
// Получение всех постов
router.get('/', auth_middleware_1.authenticateSession, (req, res) => {
    console.log('[Posts] Запрос на получение всех постов');
    initializeController().getAllPosts(req, res);
});
// Получение постов пользователя (должен быть перед /:id)
router.get('/user/:userId', auth_middleware_1.authenticateSession, (req, res) => {
    console.log('[Posts] Запрос на получение постов пользователя:', req.params.userId);
    initializeController().getUserPosts(req, res);
});
// Создание нового поста
router.post('/', auth_middleware_1.authenticateSession, (req, res) => {
    initializeController().createPost(req, res);
});
// Поставить/убрать лайк
router.post('/:id/like', auth_middleware_1.authenticateSession, (req, res) => {
    initializeController().toggleLike(req, res);
});
// Проверить статус лайка
router.get('/:id/like', auth_middleware_1.authenticateSession, (req, res) => {
    initializeController().checkLike(req, res);
});
// Получение поста по ID (должен быть последним)
router.get('/:id', auth_middleware_1.authenticateSession, (req, res) => {
    console.log('[Posts] Запрос на получение поста по ID:', req.params.id);
    initializeController().getPostById(req, res);
});
// Обновление поста
router.put('/:id', auth_middleware_1.authenticateSession, (req, res) => {
    initializeController().updatePost(req, res);
});
// Удаление поста
router.delete('/:id', auth_middleware_1.authenticateSession, (req, res) => {
    initializeController().deletePost(req, res);
});
// Получение постов с определенной фотографией
router.get('/with-photo/:photoId', auth_middleware_1.authenticateSession, (req, res) => {
    console.log('[Posts] Запрос на получение постов с фотографией:', req.params.photoId);
    initializeController().getPostsWithPhoto(req, res);
});
exports.default = router;
