import React from 'react';
import { useNotifications } from '../../contexts/notification.context';

const NotificationExample: React.FC = () => {
  const { addNotification } = useNotifications();

  const handleSuccessClick = () => {
    addNotification({
      message: 'Операция успешно выполнена!',
      type: 'success',
      duration: 3000
    });
  };

  const handleErrorClick = () => {
    addNotification({
      message: 'Произошла ошибка при выполнении операции.',
      type: 'error',
      duration: 3000
    });
  };

  const handleWarningClick = () => {
    addNotification({
      message: 'Внимание! Возможны проблемы при выполнении операции.',
      type: 'warning',
      duration: 3000
    });
  };

  const handleInfoClick = () => {
    addNotification({
      message: 'Новые сообщения доступны в вашем почтовом ящике.',
      type: 'info',
      duration: 3000
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '200px' }}>
      <h3>Тест уведомлений</h3>
      <button onClick={handleSuccessClick}>Успех</button>
      <button onClick={handleErrorClick}>Ошибка</button>
      <button onClick={handleWarningClick}>Предупреждение</button>
      <button onClick={handleInfoClick}>Информация</button>
    </div>
  );
};

export default NotificationExample; 