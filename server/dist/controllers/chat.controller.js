"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatController = void 0;
const db_connect_1 = require("../db/db_connect");
const chat_entity_1 = require("../entities/chat.entity");
const message_entity_1 = require("../entities/message.entity");
const user_entity_1 = require("../entities/user.entity");
class ChatController {
    // Получение всех чатов
    static async getAllChats(req, res) {
        try {
            const chatRepository = db_connect_1.AppDataSource.getRepository(chat_entity_1.Chat);
            const chats = await chatRepository.find({
                relations: ['participants']
            });
            res.json(chats);
        }
        catch (error) {
            res.status(500).json({ message: 'Ошибка при получении списка чатов', error });
        }
    }
    // Создание нового чата
    static async createChat(req, res) {
        try {
            const { type, participantIds } = req.body;
            if (!participantIds || !Array.isArray(participantIds) || participantIds.length < 2) {
                return res.status(400).json({
                    message: 'Необходимо указать как минимум двух участников чата'
                });
            }
            const chatRepository = db_connect_1.AppDataSource.getRepository(chat_entity_1.Chat);
            const userRepository = db_connect_1.AppDataSource.getRepository(user_entity_1.User);
            // Находим всех пользователей по их ID
            const participants = await userRepository.findByIds(participantIds);
            if (participants.length !== participantIds.length) {
                return res.status(400).json({
                    message: 'Некоторые пользователи не найдены'
                });
            }
            // Создаем новый чат
            const chat = chatRepository.create({
                type,
                participants
            });
            await chatRepository.save(chat);
            // Получаем чат с загруженными отношениями
            const savedChat = await chatRepository.findOne({
                where: { id: chat.id },
                relations: ['participants']
            });
            res.status(201).json(savedChat);
        }
        catch (error) {
            res.status(500).json({ message: 'Ошибка при создании чата', error });
        }
    }
    // Получение чата по ID
    static async getChatById(req, res) {
        try {
            const chatRepository = db_connect_1.AppDataSource.getRepository(chat_entity_1.Chat);
            const chat = await chatRepository.findOne({
                where: { id: parseInt(req.params.id) },
                relations: ['participants', 'messages', 'messages.sender']
            });
            if (!chat) {
                return res.status(404).json({ message: 'Чат не найден' });
            }
            res.json(chat);
        }
        catch (error) {
            res.status(500).json({ message: 'Ошибка при получении чата', error });
        }
    }
    // Получение всех чатов пользователя
    static async getUserChats(req, res) {
        try {
            const chatRepository = db_connect_1.AppDataSource.getRepository(chat_entity_1.Chat);
            const chats = await chatRepository
                .createQueryBuilder('chat')
                .leftJoinAndSelect('chat.participants', 'participant')
                .leftJoinAndSelect('chat.messages', 'message')
                .leftJoinAndSelect('message.sender', 'sender')
                .where('participant.id = :userId', { userId: parseInt(req.params.userId) })
                .getMany();
            res.json(chats);
        }
        catch (error) {
            res.status(500).json({ message: 'Ошибка при получении чатов', error });
        }
    }
    // Отправка сообщения в чат
    static async sendMessage(req, res) {
        try {
            const chatRepository = db_connect_1.AppDataSource.getRepository(chat_entity_1.Chat);
            const messageRepository = db_connect_1.AppDataSource.getRepository(message_entity_1.Message);
            const userRepository = db_connect_1.AppDataSource.getRepository(user_entity_1.User);
            const chat = await chatRepository.findOne({
                where: { id: parseInt(req.params.chatId) },
                relations: ['participants']
            });
            if (!chat) {
                return res.status(404).json({ message: 'Чат не найден' });
            }
            const sender = await userRepository.findOne({
                where: { id: parseInt(req.body.senderId) }
            });
            if (!sender) {
                return res.status(404).json({ message: 'Отправитель не найден' });
            }
            // Проверяем, является ли отправитель участником чата
            if (!chat.participants.some(p => p.id === sender.id)) {
                return res.status(403).json({ message: 'Пользователь не является участником чата' });
            }
            const message = messageRepository.create({
                content: req.body.content,
                sender,
                chat
            });
            await messageRepository.save(message);
            res.status(201).json(message);
        }
        catch (error) {
            res.status(500).json({ message: 'Ошибка при отправке сообщения', error });
        }
    }
    // Удаление чата
    static async deleteChat(req, res) {
        try {
            const chatRepository = db_connect_1.AppDataSource.getRepository(chat_entity_1.Chat);
            const result = await chatRepository.delete(parseInt(req.params.id));
            if (result.affected === 0) {
                return res.status(404).json({ message: 'Чат не найден' });
            }
            res.json({ message: 'Чат успешно удален' });
        }
        catch (error) {
            res.status(500).json({ message: 'Ошибка при удалении чата', error });
        }
    }
}
exports.ChatController = ChatController;
