import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';

// Типы уведомлений
export type NotificationType = 'success' | 'error' | 'info' | 'warning';

// Интерфейс для уведомления
export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number; // Время в мс, через которое уведомление автоматически скроется
}

// Интерфейс контекста
interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

// Создание контекста с начальным значением
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Провайдер контекста
export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Добавление нового уведомления
  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Date.now().toString();
    const newNotification = { ...notification, id };
    
    setNotifications((prev) => [...prev, newNotification]);

    // Автоматическое удаление уведомления через указанное время
    if (notification.duration) {
      setTimeout(() => {
        removeNotification(id);
      }, notification.duration);
    }
  }, []);

  // Удаление уведомления по ID
  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  }, []);

  // Очистка всех уведомлений
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Очистка уведомлений при размонтировании компонента
  useEffect(() => {
    return () => {
      setNotifications([]);
    };
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        removeNotification,
        clearNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

// Хук для использования контекста уведомлений
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  
  if (context === undefined) {
    throw new Error('useNotifications должен использоваться внутри NotificationProvider');
  }
  
  return context;
};

