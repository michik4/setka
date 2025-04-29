import React, { useEffect, useState } from 'react';
import { useNotifications, Notification } from '../../contexts/notification.context';
import styles from './Notifications.module.css';

// Компонент для отображения отдельного уведомления
const NotificationItem: React.FC<{
  notification: Notification;
  onClose: (id: string) => void;
}> = ({ notification, onClose }) => {
  const { id, message, type } = notification;

  // Эффект для анимации появления
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    // Задержка для анимации появления
    setTimeout(() => setIsVisible(true), 10);
  }, []);

  return (
    <div 
      className={`${styles.notification} ${styles[type]} ${isVisible ? styles.visible : ''}`}
      data-testid="notification-item"
    >
      <div className={styles.content}>
        <span className={styles.message}>{message}</span>
      </div>
      <button
        onClick={() => onClose(id)}
        className={styles.closeButton}
        aria-label="Закрыть уведомление"
      >
        ×
      </button>
    </div>
  );
};

// Компонент-контейнер для списка уведомлений
const NotificationList: React.FC = () => {
  const { notifications, removeNotification } = useNotifications();

  // Если нет уведомлений, ничего не рендерим
  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className={styles.notificationContainer} role="alert">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onClose={removeNotification}
        />
      ))}
    </div>
  );
};

export default NotificationList; 