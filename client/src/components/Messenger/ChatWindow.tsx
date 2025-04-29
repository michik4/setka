import React, { useState, useRef, useEffect } from 'react';
import { Conversation, Message } from '../../types/messenger.types';
import { useAuth } from '../../contexts/AuthContext';
import { useMessenger } from '../../contexts/MessengerContext';
import { format } from 'date-fns';
import styles from './ChatWindow.module.css';

interface ChatWindowProps {
  conversation: Conversation | null;
  messages: Message[];
  loading: boolean;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  conversation,
  messages,
  loading
}) => {
  const { user } = useAuth();
  const { sendMessage } = useMessenger();
  const [messageText, setMessageText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Получение имени беседы
  const getConversationName = (): string => {
    if (!conversation) return '';
    
    if (conversation.name) {
      return conversation.name;
    }
    
    if (!conversation.isGroup && user) {
      const otherUser = conversation.participants.find(p => p.id !== user.id);
      return otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : 'Беседа';
    }
    
    return `Беседа #${conversation.id}`;
  };

  // Получение аватара беседы
  const getConversationAvatar = (): string | undefined => {
    if (!conversation) return undefined;
    
    if (conversation.avatarUrl) {
      return conversation.avatarUrl;
    }
    
    if (!conversation.isGroup && user) {
      const otherUser = conversation.participants.find(p => p.id !== user.id);
      return otherUser?.avatar?.path;
    }
    
    return undefined;
  };

  // Форматирование времени сообщения
  const formatTime = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return format(date, 'HH:mm');
    } catch (e) {
      return '';
    }
  };

  // Обработчик отправки сообщения
  const handleSendMessage = async () => {
    if (!messageText.trim() || !conversation || !user) return;
    
    try {
      await sendMessage(conversation.id, messageText);
      setMessageText('');
      inputRef.current?.focus();
    } catch (error) {
      console.error('Ошибка при отправке сообщения:', error);
    }
  };

  // Обработчик нажатия клавиши Enter
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Информация об участниках беседы
  const getParticipantsInfo = (): string => {
    if (!conversation) return '';
    
    if (conversation.isGroup) {
      return `${conversation.participants.length} участников`;
    }
    
    return 'Личная беседа';
  };

  // Если нет активной беседы, показываем заглушку
  if (!conversation) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <div>Выберите беседу, чтобы начать общение</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div 
          className={styles.avatar} 
          style={{ backgroundImage: getConversationAvatar() ? `url(${getConversationAvatar()})` : 'none' }}
        />
        <div className={styles.conversationInfo}>
          <div className={styles.conversationName}>{getConversationName()}</div>
          <div className={styles.participantsInfo}>{getParticipantsInfo()}</div>
        </div>
      </div>
      
      <div className={styles.messagesContainer}>
        {loading ? (
          <div className={styles.loadingIndicator}>Загрузка сообщений...</div>
        ) : messages.length === 0 ? (
          <div className={styles.emptyState}>
            <div>Нет сообщений</div>
            <div>Начните общение прямо сейчас</div>
          </div>
        ) : (
          <>
            <div ref={messagesEndRef} />
            {messages.map(message => {
              const isOwn = user?.id === message.sender.id;
              
              return (
                <div 
                  key={message.id} 
                  className={`${styles.messageGroup} ${isOwn ? styles.messageGroupOwn : styles.messageGroupOther}`}
                >
                  {!isOwn && (
                    <div 
                      className={styles.messageAvatar} 
                      style={{ backgroundImage: message.sender.avatar?.path ? `url(${message.sender.avatar.path})` : 'none' }}
                    />
                  )}
                  <div className={styles.messageBubble}>
                    {conversation.isGroup && !isOwn && (
                      <div className={styles.messageSender}>
                        {`${message.sender.firstName} ${message.sender.lastName}`}
                      </div>
                    )}
                    <div className={`${styles.messageContent} ${isOwn ? styles.messageContentOwn : styles.messageContentOther}`}>
                      <div className={styles.messageText}>{message.content}</div>
                      <div className={`${styles.messageTime} ${isOwn ? styles.messageTimeOwn : styles.messageTimeOther}`}>
                        {formatTime(message.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
      
      <div className={styles.inputContainer}>
        <input
          className={styles.messageInput}
          ref={inputRef}
          placeholder="Введите сообщение..."
          value={messageText}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMessageText(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <button 
          className={styles.sendButton}
          onClick={handleSendMessage} 
          disabled={!messageText.trim()}
        >
          →
        </button>
      </div>
    </div>
  );
};

export default ChatWindow; 