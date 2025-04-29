import { AppDataSource } from '../db/db_connect';
import { Conversation } from '../entities/conversation.entity';
import { User } from '../entities/user.entity';
import { Message } from '../entities/message.entity';
import { In } from 'typeorm';

export class ConversationService {
  private conversationRepository = AppDataSource.getRepository(Conversation);
  private userRepository = AppDataSource.getRepository(User);
  private messageRepository = AppDataSource.getRepository(Message);

  async getConversationById(id: number): Promise<Conversation | null> {
    return this.conversationRepository.findOne({
      where: { id },
      relations: ['participants', 'messages']
    });
  }

  async getUserConversations(userId: number): Promise<Conversation[]> {
    return this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.participants', 'participant')
      .leftJoinAndSelect('participant.avatar', 'avatar')
      .leftJoin('conversation.messages', 'message')
      .where('participant.id = :userId', { userId })
      .orderBy('conversation.updatedAt', 'DESC')
      .getMany();
  }

  async getConversationWithLastMessage(id: number): Promise<any> {
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

  async createConversation(userIds: number[], name?: string, isGroup = false): Promise<Conversation> {
    const users = await this.userRepository.findBy({ id: In(userIds) });
    
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

    const conversation = new Conversation();
    conversation.name = name || '';
    conversation.isGroup = isGroup;
    conversation.participants = users;

    await this.conversationRepository.save(conversation);
    
    return conversation;
  }

  async updateLastMessage(conversationId: number, messageId: number): Promise<void> {
    await this.conversationRepository.update(
      { id: conversationId },
      { lastMessageId: messageId, updatedAt: new Date() }
    );
  }

  async addParticipant(conversationId: number, userId: number): Promise<Conversation | null> {
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

  async removeParticipant(conversationId: number, userId: number): Promise<boolean> {
    const conversation = await this.getConversationById(conversationId);
    
    if (!conversation) {
      return false;
    }
    
    conversation.participants = conversation.participants.filter(p => p.id !== userId);
    await this.conversationRepository.save(conversation);
    
    return true;
  }
} 