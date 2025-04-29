import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Conversation, Message, MessengerContextType, MessengerState } from '../types/messenger.types';
import { useAuth } from './AuthContext';
import { api } from '../utils/api';

const MessengerContext = createContext<MessengerContextType | undefined>(undefined);

export const MessengerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  
  const [state, setState] = useState<MessengerState>({
    conversations: [],
    activeConversation: null,
    messages: {},
    loadingConversations: false,
    loadingMessages: false,
    unreadCounts: {},
    error: null
  });

  // Загрузка списка бесед
  const getConversations = useCallback(async () => {
    if (!user) return;
    
    setState(prev => ({ ...prev, loadingConversations: true, error: null }));
    
    try {
      // В реальном приложении здесь будет запрос к API
      // const response = await api.get('/api/conversations');
      // const conversations = response.data;
      
      // Для демонстрации используем моковые данные
      const mockConversations: Conversation[] = [
        {
          id: 1,
          name: null,
          isGroup: false,
          participants: [
            { 
              id: 1, 
              firstName: 'Иван', 
              lastName: 'Иванов', 
              email: 'ivan@example.com',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              avatar: {
                id: 1,
                filename: 'user1.jpg',
                originalName: 'user1.jpg',
                mimetype: 'image/jpeg',
                size: 1024,
                path: '/avatars/user1.jpg',
                extension: 'jpg',
                isDeleted: false,
                userId: 1,
                createdAt: new Date().toISOString()
              }
            },
            { 
              id: user.id, 
              firstName: user.firstName, 
              lastName: user.lastName, 
              email: user.email,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ],
          lastMessageId: 101,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          avatarUrl: null,
          lastMessage: {
            id: 101,
            content: 'Привет, как дела?',
            sender: {
              id: 1,
              firstName: 'Иван',
              lastName: 'Иванов',
              email: 'ivan@example.com',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            senderId: 1,
            conversationId: 1,
            isRead: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        },
        {
          id: 2,
          name: 'Проектная группа',
          isGroup: true,
          participants: [
            { 
              id: 1, 
              firstName: 'Иван', 
              lastName: 'Иванов', 
              email: 'ivan@example.com',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              avatar: {
                id: 1,
                filename: 'user1.jpg',
                originalName: 'user1.jpg',
                mimetype: 'image/jpeg',
                size: 1024,
                path: '/avatars/user1.jpg',
                extension: 'jpg',
                isDeleted: false,
                userId: 1,
                createdAt: new Date().toISOString()
              }
            },
            { 
              id: 2, 
              firstName: 'Мария', 
              lastName: 'Петрова', 
              email: 'maria@example.com',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              avatar: {
                id: 2,
                filename: 'user2.jpg',
                originalName: 'user2.jpg',
                mimetype: 'image/jpeg',
                size: 1024,
                path: '/avatars/user2.jpg',
                extension: 'jpg',
                isDeleted: false,
                userId: 2,
                createdAt: new Date().toISOString()
              }
            },
            { 
              id: user.id, 
              firstName: user.firstName, 
              lastName: user.lastName, 
              email: user.email,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ],
          lastMessageId: 202,
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 3600000).toISOString(),
          avatarUrl: null,
          lastMessage: {
            id: 202,
            content: 'Когда запланируем следующую встречу?',
            sender: {
              id: 2,
              firstName: 'Мария',
              lastName: 'Петрова',
              email: 'maria@example.com',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            senderId: 2,
            conversationId: 2,
            isRead: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        }
      ];
      
      // Имитация задержки сети
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          conversations: mockConversations,
          loadingConversations: false
        }));
        
        // Устанавливаем число непрочитанных сообщений для каждой беседы
        const counts: Record<number, number> = {};
        mockConversations.forEach(conv => {
          counts[conv.id] = conv.lastMessage && !conv.lastMessage.isRead && conv.lastMessage.senderId !== user.id ? 1 : 0;
        });
        
        setState(prev => ({
          ...prev,
          unreadCounts: counts
        }));
      }, 500);
      
    } catch (error) {
      console.error('Ошибка при загрузке бесед:', error);
      setState(prev => ({
        ...prev,
        loadingConversations: false,
        error: 'Не удалось загрузить беседы'
      }));
    }
  }, [user]);

  // Загрузка сообщений для выбранной беседы
  const getMessages = useCallback(async (conversationId: number, limit?: number, offset?: number): Promise<Message[]> => {
    setState(prev => ({ ...prev, loadingMessages: true, error: null }));
    
    try {
      // В реальном приложении здесь будет запрос к API
      // const response = await api.get(`/api/conversations/${conversationId}/messages`, {
      //   params: { limit, offset }
      // });
      // const messages = response.data;
      
      // Для демонстрации используем моковые данные
      const conversationUser = state.conversations.find(c => c.id === conversationId)?.participants.find(p => p.id !== user?.id);
      
      const mockMessages: Message[] = [
        {
          id: 1,
          content: 'Привет!',
          sender: conversationUser || {
            id: 1,
            firstName: 'Иван',
            lastName: 'Иванов',
            email: 'ivan@example.com',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          senderId: conversationUser?.id || 1,
          conversationId,
          isRead: true,
          createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          updatedAt: new Date(Date.now() - 3600000 * 2).toISOString()
        },
        {
          id: 2,
          content: 'Привет, как дела?',
          sender: {
            id: user?.id || 0,
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            email: user?.email || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          senderId: user?.id || 0,
          conversationId,
          isRead: true,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          updatedAt: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: 3,
          content: 'Хорошо, спасибо! А у тебя?',
          sender: conversationUser || {
            id: 1,
            firstName: 'Иван',
            lastName: 'Иванов',
            email: 'ivan@example.com',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          senderId: conversationUser?.id || 1,
          conversationId,
          isRead: false,
          createdAt: new Date(Date.now() - 1800000).toISOString(),
          updatedAt: new Date(Date.now() - 1800000).toISOString()
        }
      ];
      
      // Имитация задержки сети
      return new Promise((resolve) => {
        setTimeout(() => {
          setState(prev => {
            // Проверяем, если уже есть сообщения для этой беседы, не обновляем
            if (prev.messages[conversationId]?.length > 0) {
              return prev;
            }
            
            return {
              ...prev,
              messages: {
                ...prev.messages,
                [conversationId]: mockMessages
              },
              loadingMessages: false,
              unreadCounts: {
                ...prev.unreadCounts,
                [conversationId]: 0
              }
            };
          });
          
          resolve(mockMessages);
        }, 700);
      });
      
    } catch (error) {
      console.error('Ошибка при загрузке сообщений:', error);
      setState(prev => ({
        ...prev,
        loadingMessages: false,
        error: 'Не удалось загрузить сообщения'
      }));
      return [];
    }
  }, [user]);

  // Отправка сообщения
  const sendMessage = useCallback(async (conversationId: number, content: string): Promise<void> => {
    if (!content.trim() || !user) return;
    
    try {
      // В реальном приложении здесь будет запрос к API
      // const response = await api.post(`/api/conversations/${conversationId}/messages`, { content });
      // const newMessage = response.data;
      
      // Для демонстрации создаем моковое сообщение
      const newMessage: Message = {
        id: Math.floor(Math.random() * 10000),
        content,
        sender: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        senderId: user.id,
        conversationId,
        isRead: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Обновляем сообщения и беседы
      setState(prev => {
        const conversationMessages = prev.messages[conversationId] || [];
        const updatedConversations = prev.conversations.map(conv => 
          conv.id === conversationId 
            ? { 
                ...conv, 
                lastMessage: newMessage, 
                lastMessageId: newMessage.id,
                updatedAt: new Date().toISOString() 
              } 
            : conv
        );
        
        return {
          ...prev,
          messages: {
            ...prev.messages,
            [conversationId]: [...conversationMessages, newMessage]
          },
          conversations: updatedConversations
        };
      });
      
    } catch (error) {
      console.error('Ошибка при отправке сообщения:', error);
      setState(prev => ({
        ...prev,
        error: 'Не удалось отправить сообщение'
      }));
    }
  }, [user]);

  // Создание новой беседы
  const createConversation = useCallback(async (
    userIds: number[], 
    name?: string, 
    isGroup: boolean = false
  ): Promise<Conversation | null> => {
    if (!user) return null;
    
    try {
      // В реальном приложении здесь будет запрос к API
      // const response = await api.post('/api/conversations', { participants: userIds, name, isGroup });
      // const newConversation = response.data;
      
      // Для демонстрации создаем моковую беседу
      const mockParticipants = [
        // Текущий пользователь
        { 
          id: user.id, 
          firstName: user.firstName, 
          lastName: user.lastName, 
          email: user.email,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        // Другие участники (используем моковые данные)
        ...userIds
          .filter(id => id !== user.id)
          .map(id => ({
            id,
            firstName: `Участник ${id}`,
            lastName: '',
            email: `user${id}@example.com`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }))
      ];
      
      const newConversation: Conversation = {
        id: Math.floor(Math.random() * 10000),
        name: isGroup ? name || `Беседа ${Date.now()}` : null,
        isGroup,
        participants: mockParticipants,
        lastMessageId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        avatarUrl: null
      };
      
      // Добавляем беседу в список
      setState(prev => ({
        ...prev,
        conversations: [newConversation, ...prev.conversations]
      }));
      
      return newConversation;
    } catch (error) {
      console.error('Ошибка при создании беседы:', error);
      setState(prev => ({
        ...prev,
        error: 'Не удалось создать беседу'
      }));
      return null;
    }
  }, [user]);

  // Отметка сообщений как прочитанных
  const markMessagesAsRead = useCallback(async (conversationId: number): Promise<void> => {
    try {
      // В реальном приложении здесь будет запрос к API
      // await api.post(`/api/conversations/${conversationId}/messages/read`);
      
      // Обновляем состояние сообщений
      setState(prev => {
        const conversationMessages = prev.messages[conversationId] || [];
        
        // Отмечаем непрочитанные сообщения как прочитанные
        const updatedMessages = conversationMessages.map(msg => 
          !msg.isRead && msg.senderId !== user?.id 
            ? { ...msg, isRead: true, updatedAt: new Date().toISOString() } 
            : msg
        );
        
        // Обновляем последнее сообщение в беседе
        const updatedConversations = prev.conversations.map(conv => {
          if (conv.id === conversationId && conv.lastMessage && !conv.lastMessage.isRead) {
            return {
              ...conv,
              lastMessage: {
                ...conv.lastMessage,
                isRead: true,
                updatedAt: new Date().toISOString()
              }
            };
          }
          return conv;
        });
        
        return {
          ...prev,
          messages: {
            ...prev.messages,
            [conversationId]: updatedMessages
          },
          conversations: updatedConversations,
          unreadCounts: {
            ...prev.unreadCounts,
            [conversationId]: 0
          }
        };
      });
      
    } catch (error) {
      console.error('Ошибка при отметке сообщений как прочитанных:', error);
      setState(prev => ({
        ...prev,
        error: 'Не удалось отметить сообщения как прочитанные'
      }));
    }
  }, [user]);

  // Получение числа непрочитанных сообщений
  const getUnreadCounts = useCallback(async (): Promise<Record<number, number>> => {
    try {
      // В реальном приложении здесь будет запрос к API
      // const response = await api.get('/api/conversations/unread-counts');
      // return response.data;
      
      // Создаем копию текущего состояния непрочитанных сообщений
      const unreadCounts = {...state.unreadCounts};
      return unreadCounts;
    } catch (error) {
      console.error('Ошибка при получении непрочитанных сообщений:', error);
      setState(prev => ({
        ...prev,
        error: 'Не удалось получить число непрочитанных сообщений'
      }));
      return {};
    }
  }, []);

  // Установка активной беседы
  const setActiveConversation = useCallback((conversation: Conversation | null) => {
    setState(prev => ({
      ...prev,
      activeConversation: conversation
    }));
  }, []);

  // Автоматическая загрузка бесед при авторизации
  useEffect(() => {
    if (user && state.conversations.length === 0 && !state.loadingConversations) {
      getConversations();
    } else if (!user) {
      setState({
        conversations: [],
        activeConversation: null,
        messages: {},
        loadingConversations: false,
        loadingMessages: false,
        unreadCounts: {},
        error: null
      });
    }
  }, [user, getConversations, state.conversations.length, state.loadingConversations]);

  // Загрузка сообщений при выборе беседы
  useEffect(() => {
    if (state.activeConversation) {
      const conversationId = state.activeConversation.id;
      
      // Проверяем, есть ли уже сообщения для этой беседы
      const hasMessages = state.messages[conversationId]?.length > 0;
      
      // Загружаем сообщения только если их еще нет
      if (!hasMessages) {
        getMessages(conversationId);
      }
      
      // Отмечаем сообщения как прочитанные
      if (state.unreadCounts[conversationId] > 0) {
        markMessagesAsRead(conversationId);
      }
    }
  }, [state.activeConversation, getMessages, markMessagesAsRead]);

  const contextValue: MessengerContextType = {
    state,
    getConversations,
    createConversation,
    getMessages,
    sendMessage,
    setActiveConversation,
    markMessagesAsRead,
    getUnreadCounts
  };

  return (
    <MessengerContext.Provider value={contextValue}>
      {children}
    </MessengerContext.Provider>
  );
};

export const useMessenger = (): MessengerContextType => {
  const context = useContext(MessengerContext);
  if (context === undefined) {
    throw new Error('useMessenger must be used within a MessengerProvider');
  }
  return context;
};

export default MessengerContext; 