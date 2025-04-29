"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageService = void 0;
const db_connect_1 = require("../db/db_connect");
const message_entity_1 = require("../entities/message.entity");
const conversation_service_1 = require("./conversation.service");
class MessageService {
    constructor() {
        this.messageRepository = db_connect_1.AppDataSource.getRepository(message_entity_1.Message);
        this.conversationService = new conversation_service_1.ConversationService();
    }
    async getMessageById(id) {
        return this.messageRepository.findOne({
            where: { id },
            relations: ['sender', 'conversation']
        });
    }
    async getConversationMessages(conversationId, limit = 50, offset = 0) {
        return this.messageRepository
            .createQueryBuilder('message')
            .leftJoinAndSelect('message.sender', 'sender')
            .leftJoinAndSelect('sender.avatar', 'avatar')
            .where('message.conversationId = :conversationId', { conversationId })
            .orderBy('message.createdAt', 'DESC')
            .take(limit)
            .skip(offset)
            .getMany();
    }
    async createMessage(data) {
        const message = new message_entity_1.Message();
        message.conversationId = data.conversationId;
        message.senderId = data.senderId;
        message.content = data.content;
        message.isRead = false;
        const savedMessage = await this.messageRepository.save(message);
        // Обновляем lastMessageId в беседе
        await this.conversationService.updateLastMessage(data.conversationId, savedMessage.id);
        return savedMessage;
    }
    async markMessagesAsRead(conversationId, userId) {
        const result = await this.messageRepository
            .createQueryBuilder()
            .update(message_entity_1.Message)
            .set({ isRead: true })
            .where('conversationId = :conversationId', { conversationId })
            .andWhere('senderId != :userId', { userId })
            .andWhere('isRead = :isRead', { isRead: false })
            .execute();
        return result.affected || 0;
    }
    async getUnreadMessagesCount(userId) {
        const counts = await this.messageRepository
            .createQueryBuilder('message')
            .select('message.conversationId', 'conversationId')
            .addSelect('COUNT(message.id)', 'count')
            .where('message.isRead = :isRead', { isRead: false })
            .andWhere('message.senderId != :userId', { userId })
            .innerJoin('conversation_participants', 'cp', 'cp.conversation_id = message.conversationId')
            .andWhere('cp.user_id = :userId', { userId })
            .groupBy('message.conversationId')
            .getRawMany();
        return counts;
    }
}
exports.MessageService = MessageService;
