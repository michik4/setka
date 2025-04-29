"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const comment_controller_1 = require("../controllers/comment.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
let commentController = null;
// Инициализация контроллера
const initializeController = () => {
    if (!commentController) {
        commentController = new comment_controller_1.CommentController();
    }
    return commentController;
};
// Получение комментариев к посту
router.get('/post/:postId', (req, res) => {
    console.log('[Comment Routes] Запрос на получение комментариев к посту');
    initializeController().getPostComments(req, res);
});
// Получение количества комментариев к посту
router.get('/post/:postId/count', (req, res) => {
    console.log('[Comment Routes] Запрос на получение количества комментариев к посту');
    initializeController().getPostCommentsCount(req, res);
});
// Добавление комментария к посту (включая ответы на комментарии)
router.post('/post/:postId', auth_middleware_1.authenticateSession, (req, res) => {
    console.log('[Comment Routes] Запрос на добавление комментария к посту');
    initializeController().addComment(req, res);
});
// Удаление комментария
router.delete('/:commentId', auth_middleware_1.authenticateSession, (req, res) => {
    console.log('[Comment Routes] Запрос на удаление комментария');
    initializeController().deleteComment(req, res);
});
exports.default = router;
