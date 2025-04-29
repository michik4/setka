import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../../contexts/notification.context';
import styles from './NotificationDrawer.module.css';

// Типы для уведомлений в панели (отличаются от всплывающих уведомлений)
export type NotificationDrawerItemType = 'group' | 'friend' | 'post' | 'comment' | 'system';

// Интерфейс хранимого уведомления
export interface NotificationDrawerItem {
  id: string;
  title: string;
  message: string;
  type: NotificationDrawerItemType;
  timestamp: Date;
  read: boolean;
  link?: string; // Ссылка для перехода при клике на уведомление
  imageUrl?: string; // URL аватарки или изображения
}

// Моковые данные для демонстрации
const MOCK_NOTIFICATIONS: NotificationDrawerItem[] = [
  {
    id: '1',
    title: 'Новая заявка в друзья',
    message: 'Михаил Иванов хочет добавить вас в друзья',
    type: 'friend',
    timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 минут назад
    read: false,
    link: '/friends',
    imageUrl: 'https://placehold.co/48x48'
  },
  {
    id: '2',
    title: 'Новый комментарий',
    message: 'Анна Петрова прокомментировала вашу запись: "Отличный пост!"',
    type: 'comment',
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 минут назад
    read: false,
    link: '/users/1?post=123',
    imageUrl: 'https://placehold.co/48x48'
  },
  {
    id: '3',
    title: 'Обновление в группе',
    message: 'В группе "Технологии 2024" новая публикация',
    type: 'group',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 часа назад
    read: true,
    link: '/groups/123',
    imageUrl: 'https://placehold.co/48x48'
  },
  {
    id: '4',
    title: 'Системное уведомление',
    message: 'Ваш профиль успешно обновлен',
    type: 'system',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 день назад
    read: true
  }
];

// Форматирование времени
const formatTime = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  // Меньше минуты
  if (diff < 60 * 1000) {
    return 'Только что';
  }
  
  // Минуты
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000));
    return `${minutes} ${getMinutesText(minutes)} назад`;
  }
  
  // Часы
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    return `${hours} ${getHoursText(hours)} назад`;
  }
  
  // Дни
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    return `${days} ${getDaysText(days)} назад`;
  }
  
  // Полная дата
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Вспомогательные функции для правильных склонений
const getMinutesText = (minutes: number): string => {
  if (minutes % 10 === 1 && minutes % 100 !== 11) return 'минуту';
  if ([2, 3, 4].includes(minutes % 10) && ![12, 13, 14].includes(minutes % 100)) return 'минуты';
  return 'минут';
};

const getHoursText = (hours: number): string => {
  if (hours % 10 === 1 && hours % 100 !== 11) return 'час';
  if ([2, 3, 4].includes(hours % 10) && ![12, 13, 14].includes(hours % 100)) return 'часа';
  return 'часов';
};

const getDaysText = (days: number): string => {
  if (days % 10 === 1 && days % 100 !== 11) return 'день';
  if ([2, 3, 4].includes(days % 10) && ![12, 13, 14].includes(days % 100)) return 'дня';
  return 'дней';
};

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState<NotificationDrawerItem[]>(MOCK_NOTIFICATIONS);
  const drawerRef = useRef<HTMLDivElement>(null);
  
  // Закрытие при клике вне панели
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(event.target as Node) && isOpen) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);
  
  // Пометить уведомление как прочитанное
  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };
  
  // Обработчик клика по уведомлению
  const handleNotificationClick = (notification: NotificationDrawerItem) => {
    markAsRead(notification.id);
    // Если есть ссылка, можно здесь добавить навигацию
    // navigate(notification.link);
  };
  
  // Пометить все как прочитанные
  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
  };
  
  // Кол-во непрочитанных уведомлений
  const unreadCount = notifications.filter(notif => !notif.read).length;
  
  if (!isOpen) return null;
  
  return (
    <div className={styles.drawer} ref={drawerRef}>
      <div className={styles.header}>
        <h3 className={styles.title}>Уведомления</h3>
        {unreadCount > 0 && (
          <button 
            className={styles.markReadButton}
            onClick={markAllAsRead}
          >
            Прочитать все
          </button>
        )}
      </div>
      
      <div className={styles.content}>
        {notifications.length === 0 ? (
          <div className={styles.emptyState}>
            <p>У вас нет уведомлений</p>
          </div>
        ) : (
          <ul className={styles.notificationList}>
            {notifications.map((notification) => (
              <li 
                key={notification.id} 
                className={`${styles.notificationItem} ${!notification.read ? styles.unread : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                {notification.imageUrl ? (
                  <div className={styles.avatar}>
                    <img src={notification.imageUrl} alt="" />
                  </div>
                ) : (
                  <div className={`${styles.typeIcon} ${styles[notification.type]}`}>
                    {/* Иконка в зависимости от типа */}
                    {notification.type === 'friend' && '👤'}
                    {notification.type === 'comment' && '💬'}
                    {notification.type === 'group' && '👥'}
                    {notification.type === 'post' && '📄'}
                    {notification.type === 'system' && '⚙️'}
                  </div>
                )}
                <div className={styles.notificationContent}>
                  <div className={styles.notificationHeader}>
                    <h4 className={styles.notificationTitle}>{notification.title}</h4>
                    <span className={styles.timestamp}>{formatTime(notification.timestamp)}</span>
                  </div>
                  <p className={styles.notificationMessage}>{notification.message}</p>
                </div>
                {!notification.read && <div className={styles.unreadIndicator}></div>}
              </li>
            ))}
          </ul>
        )}
      </div>
      
      <div className={styles.footer}>
        <a href="/notifications" className={styles.allNotificationsLink}>
          Показать все уведомления
        </a>
      </div>
    </div>
  );
};

export default NotificationDrawer; 