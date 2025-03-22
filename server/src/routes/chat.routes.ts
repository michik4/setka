import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';

const router = Router();

// Получение всех чатов
router.get('/', ChatController.getAllChats);

// Создание нового чата
router.post('/', ChatController.createChat);

// Получение чата по ID
router.get('/:id', ChatController.getChatById);

// Получение всех чатов пользователя
router.get('/user/:userId', ChatController.getUserChats);

// Отправка сообщения в чат
router.post('/:chatId/messages', ChatController.sendMessage);

// Удаление чата
router.delete('/:id', ChatController.deleteChat);

export default router; 