import React from 'react';
import { Conversation } from '../../types/messenger.types';
import { User } from '../../types/user.types';
import { useAuth } from '../../contexts/AuthContext';
import styles from './ConversationsList.module.css';

interface ConversationsListProps {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  onSelectConversation: (conversation: Conversation) => void;
  onNewConversation: () => void;
  unreadCounts: Record<number, number>;
  loading: boolean;
}

const ConversationsList: React.FC<ConversationsListProps> = ({
  conversations,
  activeConversation,
  onSelectConversation,
  onNewConversation,
  unreadCounts,
  loading
}) => {
  const { user } = useAuth();

  // Получение имени беседы в зависимости от типа
  const getConversationName = (conversation: Conversation): string => {
    if (conversation.name) {
      return conversation.name;
    }
    
    if (!conversation.isGroup && user) {
      // Для личной беседы показываем имя собеседника
      const otherUser = conversation.participants.find(p => p.id !== user.id);
      return otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : 'Беседа';
    }
    
    return `Беседа #${conversation.id}`;
  };

  // Получение аватара беседы
  const getConversationAvatar = (conversation: Conversation): string | undefined => {
    if (conversation.avatarUrl) {
      return conversation.avatarUrl;
    }
    
    if (!conversation.isGroup && user) {
      const otherUser = conversation.participants.find(p => p.id !== user.id);
      return otherUser?.avatar?.path;
    }
    
    return undefined;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Сообщения</h2>
        <button className={styles.newConversationButton} onClick={onNewConversation}>
          Новая
        </button>
      </div>
      
      {loading ? (
        <div className={styles.loadingIndicator}>Загрузка...</div>
      ) : conversations.length === 0 ? (
        <div className={styles.emptyList}>Нет бесед</div>
      ) : (
        conversations.map(conversation => {
          const isActive = activeConversation?.id === conversation.id;
          
          return (
            <div
              key={conversation.id}
              className={`${styles.conversationItem} ${isActive ? styles.conversationItemActive : styles.conversationItemInactive}`}
              onClick={() => onSelectConversation(conversation)}
            >
              <div 
                className={styles.avatar} 
                style={{ backgroundImage: getConversationAvatar(conversation) ? `url(${getConversationAvatar(conversation)})` : 'none' }}
              />
              <div className={styles.conversationInfo}>
                <div className={styles.conversationName}>
                  {getConversationName(conversation)}
                </div>
                <div className={styles.lastMessage}>
                  {conversation.lastMessage ? 
                    conversation.lastMessage.content.length > 30 ? 
                      `${conversation.lastMessage.content.substring(0, 30)}...` : 
                      conversation.lastMessage.content 
                    : 'Нет сообщений'}
                </div>
              </div>
              {unreadCounts[conversation.id] > 0 && (
                <div className={styles.unreadBadge}>{unreadCounts[conversation.id]}</div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

export default ConversationsList; 