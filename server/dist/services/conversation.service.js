"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationService = void 0;
const db_connect_1 = require("../db/db_connect");
const conversation_entity_1 = require("../entities/conversation.entity");
const user_entity_1 = require("../entities/user.entity");
const message_entity_1 = require("../entities/message.entity");
const typeorm_1 = require("typeorm");
class ConversationService {
    constructor() {
        this.conversationRepository = db_connect_1.AppDataSource.getRepository(conversation_entity_1.Conversation);
        this.userRepository = db_connect_1.AppDataSource.getRepository(user_entity_1.User);
        this.messageRepository = db_connect_1.AppDataSource.getRepository(message_entity_1.Message);
    }
    async getConversationById(id) {
        return this.conversationRepository.findOne({
            where: { id },
            relations: ['participants', 'messages']
        });
    }
    async getUserConversations(userId) {
        return this.conversationRepository
            .createQueryBuilder('conversation')
            .leftJoinAndSelect('conversation.participants', 'participant')
            .leftJoinAndSelect('participant.avatar', 'avatar')
            .leftJoin('conversation.messages', 'message')
            .where('participant.id = :userId', { userId })
            .orderBy('conversation.updatedAt', 'DESC')
            .getMany();
    }
    async getConversationWithLastMessage(id) {
        const conversation = await this.conversationRepository
            .createQueryBuilder('conversation')
            .leftJoinAndSelect('conversation.participants', 'participant')
            .leftJoinAndSelect('participant.avatar', 'avatar')
            .where('conversation.id = :id', { id })
            .getOne();
        if (!conversation) {
            return null;
        }
        const lastMessage = await this.messageRepository
            .createQueryBuilder('message')
            .leftJoinAndSelect('message.sender', 'sender')
            .where('message.conversationId = :conversationId', { conversationId: id })
            .orderBy('message.createdAt', 'DESC')
            .getOne();
        return {
            ...conversation,
            lastMessage
        };
    }
    async createConversation(userIds, name, isGroup = false) {
        const users = await this.userRepository.findBy({ id: (0, typeorm_1.In)(userIds) });
        // Проверка на существующий диалог между двумя пользователями
        if (!isGroup && userIds.length === 2) {
            const existingConversation = await this.conversationRepository
                .createQueryBuilder('conversation')
                .innerJoin('conversation.participants', 'participant1')
                .innerJoin('conversation.participants', 'participant2')
                .where('participant1.id = :firstUserId', { firstUserId: userIds[0] })
                .andWhere('participant2.id = :secondUserId', { secondUserId: userIds[1] })
                .andWhere('conversation.isGroup = :isGroup', { isGroup: false })
                .getOne();
            if (existingConversation) {
                return existingConversation;
            }
        }
        const conversation = new conversation_entity_1.Conversation();
        conversation.name = name || '';
        conversation.isGroup = isGroup;
        conversation.participants = users;
        await this.conversationRepository.save(conversation);
        return conversation;
    }
    async updateLastMessage(conversationId, messageId) {
        await this.conversationRepository.update({ id: conversationId }, { lastMessageId: messageId, updatedAt: new Date() });
    }
    async addParticipant(conversationId, userId) {
        const conversation = await this.getConversationById(conversationId);
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!conversation || !user) {
            return null;
        }
        if (!conversation.participants.some(p => p.id === userId)) {
            conversation.participants.push(user);
            await this.conversationRepository.save(conversation);
        }
        return conversation;
    }
    async removeParticipant(conversationId, userId) {
        const conversation = await this.getConversationById(conversationId);
        if (!conversation) {
            return false;
        }
        conversation.participants = conversation.participants.filter(p => p.id !== userId);
        await this.conversationRepository.save(conversation);
        return true;
    }
}
exports.ConversationService = ConversationService;
