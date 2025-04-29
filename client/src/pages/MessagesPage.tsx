import React, { useState, useEffect } from 'react';
import { useMessenger } from '../contexts/MessengerContext';
import { Conversation } from '../types/messenger.types';
import styles from './MessagesPage.module.css';
import ConversationsList from '../components/Messenger/ConversationsList';
import ChatWindow from '../components/Messenger/ChatWindow';
import NewConversationModal from '../components/Messenger/NewConversationModal';
import { useAuth } from '../contexts/AuthContext';

const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const { 
    state, 
    getConversations, 
    getMessages, 
    setActiveConversation 
  } = useMessenger();
  
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    if (user) {
      getConversations();
    }
  }, [user, getConversations]);

  // Установка активной беседы и загрузка сообщений
  const handleSelectConversation = async (conversation: Conversation) => {
    setActiveConversation(conversation);
    await getMessages(conversation.id);
  };

  // Обработчик создания новой беседы
  const handleNewConversationSuccess = (conversation: Conversation) => {
    setShowNewConversationModal(false);
    handleSelectConversation(conversation);
  };

  return (
    <>      
      <div className={styles.container}>
        <ConversationsList 
          conversations={state.conversations}
          activeConversation={state.activeConversation}
          onSelectConversation={handleSelectConversation}
          onNewConversation={() => setShowNewConversationModal(true)}
          unreadCounts={state.unreadCounts}
          loading={state.loadingConversations}
        />
        
        <ChatWindow 
          conversation={state.activeConversation}
          messages={state.activeConversation ? state.messages[state.activeConversation.id] || [] : []}
          loading={state.loadingMessages}
        />
      </div>
      
      {!showNewConversationModal && (
        <button 
          className={styles.addButton}
          onClick={() => setShowNewConversationModal(true)}
        >
          +
        </button>
      )}
      
      {showNewConversationModal && (
        <NewConversationModal 
          onClose={() => setShowNewConversationModal(false)}
          onSuccess={handleNewConversationSuccess}
        />
      )}
    </>
  );
};

export default MessagesPage; 