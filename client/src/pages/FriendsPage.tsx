import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { User, FriendRequestWithUser } from '../types/user.types';
import { api } from '../utils/api';
import { ServerImage } from '../components/ServerImage/ServerImage';
import { Link } from 'react-router-dom';
import styles from './FriendsPage.module.css';

export const FriendsPage: React.FC = () => {
  const { userId } = useParams<{ userId?: string }>();
  const { user: currentUser } = useAuth();
  const [friends, setFriends] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPending, setShowPending] = useState(false);
  const [pendingFriends, setPendingFriends] = useState<FriendRequestWithUser[]>([]);

  // Определяем ID пользователя для просмотра друзей
  const targetUserId = userId || (currentUser?.id.toString() || '');
  const isCurrentUser = currentUser?.id.toString() === targetUserId;

  // Функция загрузки списка друзей
  const fetchFriends = useCallback(async () => {
    if (!targetUserId) return;

    setLoading(true);
    try {
      console.log(`Запрос на получение списка друзей пользователя ${targetUserId}`);
      const response = await api.get(`/friends/${targetUserId}`);
      console.log('Полученные друзья (сырые данные):', response);

      if (response && Array.isArray(response)) {
        console.log(`Получено ${response.length} друзей`);
        setFriends(response);
      } else {
        console.error('Неверный формат данных друзей:', response);
        throw new Error(`Неверный формат данных друзей: ${JSON.stringify(response)}`);
      }
      setError(null);
    } catch (err: any) {
      console.error('Ошибка при получении списка друзей:', err);
      setError(err.message || 'Не удалось загрузить список друзей');
      setFriends([]);
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  // Функция загрузки заявок в друзья (если смотрим свои друзья)
  const fetchPendingFriends = useCallback(async () => {
    if (!isCurrentUser) return;

    try {
      console.log('Запрос на получение входящих заявок в друзья');
      const response = await api.get('/friends/requests');
      console.log('Полученные заявки:', response);

      if (response && Array.isArray(response)) {
        setPendingFriends(response);
      } else {
        console.error('Неверный формат данных заявок в друзья:', response);
        setPendingFriends([]);
      }
    } catch (err) {
      console.error('Ошибка при получении заявок в друзья:', err);
      setPendingFriends([]);
    }
  }, [isCurrentUser]);

  useEffect(() => {
    fetchFriends();
    if (isCurrentUser) {
      fetchPendingFriends();
    }
  }, [fetchFriends, fetchPendingFriends, isCurrentUser]);

  // Функция для принятия заявки в друзья
  const handleAcceptFriend = async (requestId: number) => {
    try {
      const senderData = pendingFriends.find(req => req.id === requestId)?.sender;
      if (!senderData) {
        throw new Error('Не удалось найти отправителя запроса');
      }

      console.log(`Принимаем заявку от пользователя ${senderData.firstName} ${senderData.lastName} (ID: ${senderData.id})`);

      await api.post(`/friends/accept/${senderData.id}`, {});

      // Сначала обновляем UI без запроса, чтобы предоставить мгновенную обратную связь
      setPendingFriends(prev => prev.filter(req => req.id !== requestId));

      // Затем обновляем списки через API для уверенности в согласованности данных
      await fetchPendingFriends();
      await fetchFriends();

      alert(`Заявка от пользователя ${senderData.firstName} ${senderData.lastName} принята!`);
    } catch (err: any) {
      console.error('Ошибка при принятии заявки в друзья:', err);
      alert(`Ошибка при принятии заявки: ${err.message || 'Неизвестная ошибка'}`);
    }
  };

  // Функция для отклонения заявки в друзья
  const handleRejectFriend = async (requestId: number) => {
    try {
      const senderData = pendingFriends.find(req => req.id === requestId)?.sender;
      if (!senderData) {
        throw new Error('Не удалось найти отправителя запроса');
      }

      console.log(`Отклоняем заявку от пользователя ${senderData.firstName} ${senderData.lastName} (ID: ${senderData.id})`);

      await api.post(`/friends/reject/${senderData.id}`, {});

      // Сначала обновляем UI без запроса, чтобы предоставить мгновенную обратную связь
      setPendingFriends(prev => prev.filter(req => req.id !== requestId));

      // Затем обновляем список запросов для уверенности в согласованности данных
      await fetchPendingFriends();
    } catch (err: any) {
      console.error('Ошибка при отклонении заявки в друзья:', err);
      alert(`Ошибка при отклонении заявки: ${err.message || 'Неизвестная ошибка'}`);
    }
  };

  // Функция для удаления из друзей
  const handleRemoveFriend = async (friendId: number) => {
    try {
      console.log(`Удаление пользователя из друзей (ID: ${friendId})`);
      await api.delete(`/friends/${friendId}`);

      // Обновляем UI без запроса, чтобы предоставить мгновенную обратную связь
      setFriends(prev => prev.filter(friend => friend.id !== friendId));

      // Затем обновляем список через API для уверенности в согласованности данных
      await fetchFriends();
      console.log('Друг успешно удален, список обновлен');
    } catch (err: any) {
      console.error('Ошибка при удалении из друзей:', err);
      alert(`Ошибка при удалении из друзей: ${err.message || 'Неизвестная ошибка'}`);
    }
  };

  // Отображение имени пользователя, чьи друзья просматриваются
  const pageTitle = isCurrentUser
    ? 'Мои друзья'
    : loading || !friends.length
      ? 'Друзья пользователя'
      : `Друзья ${friends[0]?.firstName} ${friends[0]?.lastName}`;

  // Отображение лоадера во время загрузки
  if (loading && !friends.length) {
    return <div className={styles.container}><div className={styles.loading}>Загрузка списка друзей...</div></div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>{pageTitle}</h1>
      </div>
      {isCurrentUser && (
        <div className={styles.toggleContainer}>
          <button
            className={!showPending ? styles.activeButton : styles.inactiveButton}
            onClick={() => setShowPending(false)}
          >
            Мои друзья ({friends.length})
          </button>
          <button
            className={showPending ? styles.activeButton : styles.inactiveButton}
            onClick={() => setShowPending(true)}
          >
            Входящие заявки ({pendingFriends.length})
          </button>
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}

      {!showPending ? (
        <>
          {friends.length > 0 ? (
            <div className={styles.friendsList}>
              {friends.map(friend => (
                <div key={friend.id} className={styles.friendCard}>
                  <Link to={`/users/${friend.id}`} className={styles.friendLink}>
                    <div className={styles.friendAvatarContainer}>
                      <ServerImage path={friend.avatar?.path} alt={`${friend.firstName} ${friend.lastName}`} className={styles.friendAvatar} />
                    </div>
                    <div className={styles.friendInfo}>
                      <h3>{friend.firstName} {friend.lastName}</h3>
                      <p>{friend.status || 'Нет информации'}</p>
                    </div>
                  </Link>
                  {isCurrentUser && (
                    <div className={styles.deleteFriendButton}>
                      <button
                        className={styles.removeButton}
                        onClick={() => handleRemoveFriend(friend.id)}
                      >
                        Удалить из друзей
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              {isCurrentUser ? 'У вас пока нет друзей.' : 'У пользователя пока нет друзей.'}
            </div>
          )}
        </>
      ) : (
        <>
          {pendingFriends.length > 0 ? (
            <div className={styles.friendsList}>
              {pendingFriends.map(request => (
                <div key={request.id} className={styles.friendCard}>
                  <Link to={`/users/${request.sender.id}`} className={styles.friendLink}>
                    <div className={styles.friendAvatarContainer}>
                      <ServerImage path={request.sender.avatar?.path} alt={`${request.sender.firstName} ${request.sender.lastName}`} className={styles.friendAvatar} />
                    </div>
                    <div className={styles.friendInfo}>
                      <h3>{request.sender.firstName} {request.sender.lastName}</h3>
                      <p>{request.sender.status || 'Нет информации'}</p>
                    </div>
                  </Link>
                  <div className={styles.requestButtons}>
                    <button
                      className={styles.acceptButton}
                      onClick={() => handleAcceptFriend(request.id)}
                    >
                      Принять
                    </button>
                    <button
                      className={styles.rejectButton}
                      onClick={() => handleRejectFriend(request.id)}
                    >
                      Отклонить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>У вас нет входящих заявок в друзья.</div>
          )}
        </>
      )}
    </div>
  );
};