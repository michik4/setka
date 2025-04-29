import { AppDataSource } from '../db/db_connect';
import { Message } from '../entities/message.entity';
import { ConversationService } from './conversation.service';

export class MessageService {
  private messageRepository = AppDataSource.getRepository(Message);
  private conversationService: ConversationService;

  constructor() {
    this.conversationService = new ConversationService();
  }

  async getMessageById(id: number): Promise<Message | null> {
    return this.messageRepository.findOne({
      where: { id },
      relations: ['sender', 'conversation']
    });
  }

  async getConversationMessages(conversationId: number, limit = 50, offset = 0): Promise<Message[]> {
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

  async createMessage(data: { conversationId: number; senderId: number; content: string }): Promise<Message> {
    const message = new Message();
    message.conversationId = data.conversationId;
    message.senderId = data.senderId;
    message.content = data.content;
    message.isRead = false;

    const savedMessage = await this.messageRepository.save(message);
    
    // Обновляем lastMessageId в беседе
    await this.conversationService.updateLastMessage(data.conversationId, savedMessage.id);
    
    return savedMessage;
  }

  async markMessagesAsRead(conversationId: number, userId: number): Promise<number> {
    const result = await this.messageRepository
      .createQueryBuilder()
      .update(Message)
      .set({ isRead: true })
      .where('conversationId = :conversationId', { conversationId })
      .andWhere('senderId != :userId', { userId })
      .andWhere('isRead = :isRead', { isRead: false })
      .execute();
    
    return result.affected || 0;
  }

  async getUnreadMessagesCount(userId: number): Promise<{ conversationId: number; count: number }[]> {
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