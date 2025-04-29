"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chat_controller_1 = require("../controllers/chat.controller");
const router = (0, express_1.Router)();
// Получение всех чатов
router.get('/', chat_controller_1.ChatController.getAllChats);
// Создание нового чата
router.post('/', chat_controller_1.ChatController.createChat);
// Получение чата по ID
router.get('/:id', chat_controller_1.ChatController.getChatById);
// Получение всех чатов пользователя
router.get('/user/:userId', chat_controller_1.ChatController.getUserChats);
// Отправка сообщения в чат
router.post('/:chatId/messages', chat_controller_1.ChatController.sendMessage);
// Удаление чата
router.delete('/:id', chat_controller_1.ChatController.deleteChat);
exports.default = router;
