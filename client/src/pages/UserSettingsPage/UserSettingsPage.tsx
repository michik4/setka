import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import styles from './UserSettingsPage.module.css';

export const UserSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('general');
  
  if (!user) {
    return <div className={styles.notFound}>Пользователь не найден</div>;
  }

  return (
    <div className={styles.settingsContainer}>
      <h1 className={styles.title}>Настройки</h1>
      
      <div className={styles.settingsContent}>
        <div className={styles.tabsContainer}>
          <button 
            className={`${styles.tabButton} ${activeTab === 'general' ? styles.active : ''}`}
            onClick={() => setActiveTab('general')}
          >
            Основные
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'privacy' ? styles.active : ''}`}
            onClick={() => setActiveTab('privacy')}
          >
            Приватность
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'notifications' ? styles.active : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            Уведомления
          </button>
        </div>
        
        <div className={styles.tabContent}>
          {activeTab === 'general' && (
            <div className={styles.generalSettings}>
              <div className={styles.settingsSection}>
                <h2 className={styles.sectionTitle}>Личная информация</h2>
                <div className={styles.formGroup}>
                  <label>Имя</label>
                  <input type="text" defaultValue={user.firstName} />
                </div>
                <div className={styles.formGroup}>
                  <label>Фамилия</label>
                  <input type="text" defaultValue={user.lastName} />
                </div>
                <div className={styles.formGroup}>
                  <label>Почта</label>
                  <input type="email" defaultValue={user.email} />
                </div>
                <button className={styles.saveButton}>Сохранить изменения</button>
              </div>
              
              <div className={styles.settingsSection}>
                <h2 className={styles.sectionTitle}>Изменение пароля</h2>
                <div className={styles.formGroup}>
                  <label>Текущий пароль</label>
                  <input type="password" />
                </div>
                <div className={styles.formGroup}>
                  <label>Новый пароль</label>
                  <input type="password" />
                </div>
                <div className={styles.formGroup}>
                  <label>Подтверждение пароля</label>
                  <input type="password" />
                </div>
                <button className={styles.saveButton}>Изменить пароль</button>
              </div>
            </div>
          )}
          
          {activeTab === 'privacy' && (
            <div className={styles.privacySettings}>
              <div className={styles.settingsSection}>
                <h2 className={styles.sectionTitle}>Настройки приватности</h2>
                <div className={styles.settingsOption}>
                  <label className={styles.checkboxLabel}>
                    <input type="checkbox" defaultChecked />
                    <span>Кто может видеть мою страницу</span>
                  </label>
                  <select className={styles.selectControl}>
                    <option value="all">Все пользователи</option>
                    <option value="friends">Только друзья</option>
                    <option value="nobody">Никто</option>
                  </select>
                </div>
                <div className={styles.settingsOption}>
                  <label className={styles.checkboxLabel}>
                    <input type="checkbox" defaultChecked />
                    <span>Кто может писать мне сообщения</span>
                  </label>
                  <select className={styles.selectControl}>
                    <option value="all">Все пользователи</option>
                    <option value="friends">Только друзья</option>
                    <option value="nobody">Никто</option>
                  </select>
                </div>
                <button className={styles.saveButton}>Сохранить настройки</button>
              </div>
            </div>
          )}
          
          {activeTab === 'notifications' && (
            <div className={styles.notificationSettings}>
              <div className={styles.settingsSection}>
                <h2 className={styles.sectionTitle}>Настройки уведомлений</h2>
                <div className={styles.settingsOption}>
                  <label className={styles.checkboxLabel}>
                    <input type="checkbox" defaultChecked />
                    <span>Новые сообщения</span>
                  </label>
                </div>
                <div className={styles.settingsOption}>
                  <label className={styles.checkboxLabel}>
                    <input type="checkbox" defaultChecked />
                    <span>Комментарии к постам</span>
                  </label>
                </div>
                <div className={styles.settingsOption}>
                  <label className={styles.checkboxLabel}>
                    <input type="checkbox" defaultChecked />
                    <span>Приглашения в группы</span>
                  </label>
                </div>
                <button className={styles.saveButton}>Сохранить настройки</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 