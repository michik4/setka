import React, { useState, useEffect } from 'react';
import { Conversation } from '../../types/messenger.types';
import { User } from '../../types/user.types';
import { useAuth } from '../../contexts/AuthContext';
import { useMessenger } from '../../contexts/MessengerContext';
import styles from './NewConversationModal.module.css';

interface NewConversationModalProps {
  onClose: () => void;
  onSuccess: (conversation: Conversation) => void;
}

const NewConversationModal: React.FC<NewConversationModalProps> = ({ onClose, onSuccess }) => {
  const { user } = useAuth();
  const { createConversation } = useMessenger();
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Загрузка списка пользователей
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        // В реальном приложении здесь должен быть запрос к API
        // Например: const response = await api.get('/api/users');
        // Для демонстрации используем моковые данные
        const mockUsers: User[] = [
          { id: 1, firstName: 'Иван', lastName: 'Иванов', avatar: { path: '/avatars/user1.jpg' } },
          { id: 2, firstName: 'Мария', lastName: 'Петрова', avatar: { path: '/avatars/user2.jpg' } },
          { id: 3, firstName: 'Александр', lastName: 'Сидоров', avatar: null },
          { id: 4, firstName: 'Елена', lastName: 'Смирнова', avatar: { path: '/avatars/user4.jpg' } },
        ] as User[];
        
        // Фильтруем текущего пользователя
        const filteredUsers = mockUsers.filter(u => u.id !== user?.id);
        setUsers(filteredUsers);
      } catch (error) {
        console.error('Ошибка при загрузке пользователей:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [user]);

  // Фильтрация пользователей по поиску
  const filteredUsers = users.filter(user => {
    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  // Обработчик выбора пользователя
  const handleSelectUser = (selectedUser: User) => {
    // Проверяем, выбран ли уже этот пользователь
    const isSelected = selectedUsers.some(user => user.id === selectedUser.id);
    
    if (isSelected) {
      // Если выбран, удаляем из выбранных
      setSelectedUsers(selectedUsers.filter(user => user.id !== selectedUser.id));
    } else {
      // Если не группа и уже есть выбранный пользователь, заменяем его
      if (!isGroupChat && selectedUsers.length > 0) {
        setSelectedUsers([selectedUser]);
      } else {
        // Иначе добавляем к выбранным
        setSelectedUsers([...selectedUsers, selectedUser]);
      }
    }
  };

  // Обработчик создания беседы
  const handleCreateConversation = async () => {
    if (selectedUsers.length === 0) return;
    
    setCreating(true);
    try {
      // Создаем массив ID выбранных пользователей
      const userIds = selectedUsers.map(user => user.id);
      
      // Если текущий пользователь есть, добавляем его ID
      if (user) {
        userIds.push(user.id);
      }
      
      // Создаем беседу
      const conversation = await createConversation(userIds, isGroupChat ? groupName : undefined, isGroupChat);
      
      if (conversation) {
        onSuccess(conversation);
      }
    } catch (error) {
      console.error('Ошибка при создании беседы:', error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.title}>Новая беседа</h3>
          <button className={styles.closeButton} onClick={onClose}>&times;</button>
        </div>
        
        <div className={styles.modalBody}>
          <div className={styles.tabsContainer}>
            <button 
              className={`${styles.tabButton} ${!isGroupChat ? styles.tabButtonActive : styles.tabButtonInactive}`}
              onClick={() => setIsGroupChat(false)}
            >
              Личное сообщение
            </button>
            <button 
              className={`${styles.tabButton} ${isGroupChat ? styles.tabButtonActive : styles.tabButtonInactive}`}
              onClick={() => setIsGroupChat(true)}
            >
              Групповой чат
            </button>
          </div>
          
          {isGroupChat && (
            <input
              className={styles.input}
              placeholder="Название беседы..."
              value={groupName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGroupName(e.target.value)}
            />
          )}
          
          <input
            className={styles.input}
            placeholder="Поиск пользователей..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          />
          
          <div className={styles.userList}>
            {loading ? (
              <div className={styles.loadingMessage}>Загрузка пользователей...</div>
            ) : filteredUsers.length === 0 ? (
              <div className={styles.noResultsMessage}>Пользователи не найдены</div>
            ) : (
              filteredUsers.map(user => {
                const isSelected = selectedUsers.some(u => u.id === user.id);
                
                return (
                  <div 
                    key={user.id} 
                    className={`${styles.userItem} ${isSelected ? styles.userItemSelected : styles.userItemUnselected}`}
                    onClick={() => handleSelectUser(user)}
                  >
                    <input 
                      className={styles.checkbox}
                      type="checkbox" 
                      checked={isSelected}
                      readOnly
                    />
                    <div 
                      className={styles.avatar} 
                      style={{ backgroundImage: user.avatar?.path ? `url(${user.avatar.path})` : 'none' }}
                    />
                    <div className={styles.userInfo}>
                      <div className={styles.userName}>{`${user.firstName} ${user.lastName}`}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        
        <div className={styles.modalFooter}>
          <button className={`${styles.button} ${styles.buttonSecondary}`} onClick={onClose}>Отмена</button>
          <button 
            className={`${styles.button} ${styles.buttonPrimary}`}
            onClick={handleCreateConversation}
            disabled={selectedUsers.length === 0 || creating || (isGroupChat && !groupName.trim())}
          >
            {creating ? 'Создание...' : 'Создать'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewConversationModal; 