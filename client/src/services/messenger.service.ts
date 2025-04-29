import { socketService } from './socket.service';
import { Conversation, Message } from '../types/messenger.types';

class MessengerService {
  // Получить список бесед пользователя
  async getConversations(userId: number): Promise<Conversation[]> {
    return new Promise(async (resolve, reject) => {
      try {
        const socket = await socketService.getSocket();
        
        // Устанавливаем обработчик получения списка бесед
        socket.once('conversations_list', (conversations: Conversation[]) => {
          resolve(conversations);
        });
        
        // Запрашиваем список бесед
        socket.emit('get_conversations', userId);
        
        // Устанавливаем таймаут на случай, если ответ не придет
        setTimeout(() => {
          reject(new Error('Таймаут получения списка бесед'));
        }, 5000);
      } catch (error) {
        console.error('Ошибка при получении бесед:', error);
        reject(error);
      }
    });
  }
  
  // Создать новую беседу
  async createConversation(userIds: number[], name?: string, isGroup?: boolean): Promise<Conversation> {
    return new Promise(async (resolve, reject) => {
      try {
        const socket = await socketService.getSocket();
        
        // Устанавливаем обработчик создания беседы
        socket.once('conversation_created', (conversation: Conversation) => {
          resolve(conversation);
        });
        
        // Запрашиваем создание беседы
        socket.emit('create_conversation', { userIds, name, isGroup });
        
        // Устанавливаем таймаут на случай, если ответ не придет
        setTimeout(() => {
          reject(new Error('Таймаут создания беседы'));
        }, 5000);
      } catch (error) {
        console.error('Ошибка при создании беседы:', error);
        reject(error);
      }
    });
  }
  
  // Получить сообщения беседы
  async getMessages(conversationId: number, limit?: number, offset?: number): Promise<Message[]> {
    return new Promise(async (resolve, reject) => {
      try {
        const socket = await socketService.getSocket();
        
        // Устанавливаем обработчик получения сообщений
        socket.once('messages_list', (data: { conversationId: number, messages: Message[] }) => {
          if (data.conversationId === conversationId) {
            resolve(data.messages);
          } else {
            reject(new Error('Получены сообщения для другой беседы'));
          }
        });
        
        // Запрашиваем сообщения
        socket.emit('get_messages', { conversationId, limit, offset });
        
        // Устанавливаем таймаут на случай, если ответ не придет
        setTimeout(() => {
          reject(new Error('Таймаут получения сообщений'));
        }, 5000);
      } catch (error) {
        console.error('Ошибка при получении сообщений:', error);
        reject(error);
      }
    });
  }
  
  // Отправить сообщение
  async sendMessage(conversationId: number, senderId: number, content: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        if (!content.trim()) {
          reject(new Error('Сообщение не может быть пустым'));
          return;
        }
        
        const socket = await socketService.getSocket();
        
        // Отправляем сообщение
        socket.emit('send_message', { conversationId, senderId, content });
        
        // Считаем, что сообщение отправлено успешно, если нет ошибки
        // Реальное подтверждение будет получено через событие 'new_message'
        resolve();
      } catch (error) {
        console.error('Ошибка при отправке сообщения:', error);
        reject(error);
      }
    });
  }
  
  // Пометить сообщения как прочитанные
  async markMessagesAsRead(conversationId: number, userId: number): Promise<number> {
    return new Promise(async (resolve, reject) => {
      try {
        const socket = await socketService.getSocket();
        
        // Устанавливаем обработчик отметки сообщений как прочитанных
        socket.once('messages_read', (data: { conversationId: number, userId: number, count: number }) => {
          if (data.conversationId === conversationId && data.userId === userId) {
            resolve(data.count);
          } else {
            reject(new Error('Получено подтверждение для другой беседы или пользователя'));
          }
        });
        
        // Отправляем запрос на отметку сообщений
        socket.emit('mark_messages_read', { conversationId, userId });
        
        // Устанавливаем таймаут на случай, если ответ не придет
        setTimeout(() => {
          reject(new Error('Таймаут отметки сообщений как прочитанных'));
        }, 5000);
      } catch (error) {
        console.error('Ошибка при отметке сообщений как прочитанных:', error);
        reject(error);
      }
    });
  }
  
  // Получить количество непрочитанных сообщений
  async getUnreadCounts(userId: number): Promise<Record<number, number>> {
    return new Promise(async (resolve, reject) => {
      try {
        const socket = await socketService.getSocket();
        
        // Устанавливаем обработчик получения количества непрочитанных сообщений
        socket.once('unread_counts', (counts: { conversationId: number, count: number }[]) => {
          const countsMap: Record<number, number> = {};
          counts.forEach(item => {
            countsMap[item.conversationId] = item.count;
          });
          resolve(countsMap);
        });
        
        // Запрашиваем количество непрочитанных сообщений
        socket.emit('get_unread_counts', userId);
        
        // Устанавливаем таймаут на случай, если ответ не придет
        setTimeout(() => {
          reject(new Error('Таймаут получения количества непрочитанных сообщений'));
        }, 5000);
      } catch (error) {
        console.error('Ошибка при получении количества непрочитанных сообщений:', error);
        reject(error);
      }
    });
  }
  
  // Подписаться на новые сообщения
  subscribeToNewMessages(callback: (message: Message) => void): () => void {
    socketService.getSocket().then(socket => {
      socket.on('new_message', callback);
    });
    
    // Возвращаем функцию для отписки
    return () => {
      socketService.getSocket().then(socket => {
        socket.off('new_message', callback);
      });
    };
  }
  
  // Подписаться на изменения в беседах
  subscribeToConversationChanges(callback: (conversation: Conversation) => void): () => void {
    socketService.getSocket().then(socket => {
      socket.on('conversation_created', callback);
      socket.on('participant_added', (data: { conversation: Conversation }) => {
        callback(data.conversation);
      });
    });
    
    // Возвращаем функцию для отписки
    return () => {
      socketService.getSocket().then(socket => {
        socket.off('conversation_created', callback);
        socket.off('participant_added');
      });
    };
  }
}

export const messengerService = new MessengerService(); 