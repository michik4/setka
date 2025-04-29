import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Post } from '../../components/Post/Post';
import { CreatePostForm } from '../../components/CreatePostForm/CreatePostForm';
import { ServerImage } from '../../components/ServerImage/ServerImage';
import { Showcase } from '../../components/Showcase/Showcase';
import styles from './UserPage.module.css';
import { api } from '../../utils/api';
import { Post as PostType } from '../../types/post.types';
import { User, AuthUser } from '../../types/user.types';
import { useInfiniteScroll } from '../../utils/useInfiniteScroll';

export const UserPage: React.FC = () => {
    const params = useParams<{ userId: string }>();
    const userId = params.userId;
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const [user, setUser] = useState<User | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [newStatus, setNewStatus] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [friendActionLoading, setFriendActionLoading] = useState(false);
    
    // Размер страницы для постов
    const PAGE_SIZE = 10;
    
    // Для принудительного обновления списка постов
    const [refreshPostsKey, setRefreshPostsKey] = useState(0);

    const fetchUserInfo = async () => {
        if (!userId) {
            setError('Идентификатор пользователя не указан');
            return;
        }

        const id = parseInt(userId);
        if (isNaN(id)) {
            setError('Неверный формат идентификатора пользователя');
            return;
        }

        try {
            const userData = await api.get(`/users/${id}`);
            if (!userData || typeof userData !== 'object') {
                throw new Error('Некорректный формат данных пользователя');
            }
            setUser(userData);
            setNewStatus(userData.status ?? '');
            setError(null);
        } catch (err: any) {
            console.error('Ошибка при получении информации о пользователе:', err);
            setError(err.message || 'Не удалось загрузить информацию о пользователе');
        }
    };

    // Функция загрузки постов для бесконечного скролла
    const loadMoreWallPosts = useCallback(async (page: number) => {
        if (!userId) throw new Error('ID пользователя не указан');
        
        const id = parseInt(userId);
        if (isNaN(id)) throw new Error('Неверный формат ID пользователя');
        
        try {
            const response = await api.get(`/wall/${id}?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`);
            if (!response || typeof response !== 'object' || !Array.isArray(response.posts)) {
                console.error('Неверный формат данных постов:', response);
                throw new Error('Неверный формат данных постов');
            }
            return response.posts;
        } catch (err) {
            console.error('Ошибка при получении постов:', err);
            throw err;
        }
    }, [userId, PAGE_SIZE]);

    // Проверка наличия дополнительных постов
    const hasMorePosts = useCallback((data: PostType[]) => {
        return data.length === PAGE_SIZE;
    }, [PAGE_SIZE]);

    // Используем хук для бесконечного скролла
    const {
        data: wallPosts,
        loading: postsLoading,
        error: postsError,
        lastElementRef,
        hasMore: hasMorePostsToLoad,
        reset: resetPosts
    } = useInfiniteScroll<PostType>({
        loadMore: loadMoreWallPosts,
        hasMore: hasMorePosts,
        pageSize: PAGE_SIZE
    });

    // Эффект для сброса и перезагрузки постов при изменении refreshPostsKey
    useEffect(() => {
        if (refreshPostsKey > 0) {
            resetPosts();
        }
    }, [refreshPostsKey, resetPosts]);

    useEffect(() => {
        fetchUserInfo();
    }, [userId]);

    const handlePostCreated = useCallback(() => {
        // Обновляем посты после создания нового
        setRefreshPostsKey(prev => prev + 1);
    }, []);

    const handlePostDeleted = useCallback((postId: number) => {
        // При удалении поста просто перезагружаем все
        setRefreshPostsKey(prev => prev + 1);
    }, []);

    const handleStatusSave = async () => {
        if (!user) return;
        setIsSubmitting(true);
        try {
            await api.put(`/users/${user.id}`, { status: newStatus });
            setUser({ ...user, status: newStatus });
            setIsEditing(false);
            setError(null);
        } catch (err) {
            console.error('Ошибка при обновлении статуса:', err);
            setError('Не удалось обновить статус');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Функция для отправки заявки в друзья
    const handleSendFriendRequest = async () => {
        if (!user) return;
        setFriendActionLoading(true);
        
        try {
            const response = await api.post(`/friends/request/${user.id}`, {});
            console.log('Заявка успешно отправлена:', response);
            // Обновляем данные о пользователе для отображения нового статуса дружбы
            setUser({ ...user, friendshipStatus: 'pending_sent' });
            setError(null);
        } catch (err: any) {
            console.error('Ошибка при отправке заявки в друзья:', err);
            
            // Показываем сообщение об ошибке пользователю
            const errorMessage = err.message || 'Не удалось отправить заявку в друзья';
            setError(errorMessage);
            
            // Если пользователи уже друзья или уже существует запрос, обновим статус
            if (errorMessage.includes('уже являются друзьями')) {
                setUser({ ...user, friendshipStatus: 'friends' });
            } else if (errorMessage.includes('Запрос на дружбу уже существует')) {
                setUser({ ...user, friendshipStatus: 'pending_sent' });
            }
        } finally {
            setFriendActionLoading(false);
        }
    };

    // Функция для принятия заявки в друзья
    const handleAcceptFriendRequest = async () => {
        if (!user) return;
        setFriendActionLoading(true);
        
        try {
            console.log(`Принимаем заявку от пользователя с ID ${user.id}`);
            const response = await api.post(`/friends/accept/${user.id}`, {});
            console.log('Ответ сервера:', response);
            
            // Обновляем данные о пользователе для отображения нового статуса дружбы
            setUser({ ...user, friendshipStatus: 'friends' });
            
            // Показываем сообщение об успехе
            setError(null);
            
            // Принудительно обновляем список друзей, если пользователь просматривает его
            // Это можно реализовать через глобальное состояние или контекст
            // Пока просто сообщаем пользователю о необходимости обновить страницу друзей
            alert('Заявка принята! Теперь пользователь в вашем списке друзей.');
        } catch (err: any) {
            console.error('Ошибка при принятии заявки в друзья:', err);
            setError(err.message || 'Не удалось принять заявку в друзья');
        } finally {
            setFriendActionLoading(false);
        }
    };

    // Функция для отклонения заявки в друзья
    const handleRejectFriendRequest = async () => {
        if (!user) return;
        setFriendActionLoading(true);
        
        try {
            await api.post(`/friends/reject/${user.id}`, {});
            // Обновляем данные о пользователе для отображения нового статуса дружбы
            setUser({ ...user, friendshipStatus: 'none' });
        } catch (err: any) {
            console.error('Ошибка при отклонении заявки в друзья:', err);
            setError(err.message || 'Не удалось отклонить заявку в друзья');
        } finally {
            setFriendActionLoading(false);
        }
    };

    // Функция для удаления из друзей
    const handleRemoveFriend = async () => {
        if (!user) return;
        setFriendActionLoading(true);
        
        try {
            await api.delete(`/friends/${user.id}`, {});
            // Обновляем данные о пользователе для отображения нового статуса дружбы
            setUser({ ...user, friendshipStatus: 'none' });
        } catch (err: any) {
            console.error('Ошибка при удалении из друзей:', err);
            setError(err.message || 'Не удалось удалить из друзей');
        } finally {
            setFriendActionLoading(false);
        }
    };

    // Компонент кнопки для управления дружбой
    const FriendshipButton = () => {
        if (!user || isCurrentUser) return null;

        // Отображение информации о статусе дружбы
        const renderFriendshipStatus = () => {
            if (user.friendshipStatus === 'friends') {
                return <div className={styles.friendshipStatus}>У вас в друзьях</div>;
            } else if (user.friendshipStatus === 'pending_sent') {
                return <div className={styles.friendshipStatus}>Заявка отправлена</div>;
            } else if (user.friendshipStatus === 'pending_received') {
                return <div className={styles.friendshipStatus}>Хочет добавить вас в друзья</div>;
            }
            return null;
        };

        // Определяем текст и функцию для кнопки в зависимости от статуса дружбы
        let buttonText = '';
        let buttonClass = '';
        let buttonHandler = () => {};

        switch (user.friendshipStatus) {
            case 'none':
                buttonText = 'Добавить в друзья';
                buttonClass = styles.addFriendButton;
                buttonHandler = handleSendFriendRequest;
                break;
                
            case 'pending_sent':
                buttonText = 'Заявка отправлена';
                buttonClass = styles.pendingButton;
                // Можно добавить функцию для отмены заявки, но пока оставим неактивной
                break;
                
            case 'pending_received':
                // Для входящей заявки показываем две кнопки - принять и отклонить
                return (
                    <div className={styles.friendshipContainer}>
                        {renderFriendshipStatus()}
                        <div className={styles.friendActionButtons}>
                            <button 
                                className={`${styles.actionButton} ${styles.acceptButton}`}
                                onClick={handleAcceptFriendRequest}
                                disabled={friendActionLoading}
                            >
                                Принять заявку
                            </button>
                            <button 
                                className={`${styles.actionButton} ${styles.rejectButton}`}
                                onClick={handleRejectFriendRequest}
                                disabled={friendActionLoading}
                            >
                                Отклонить
                            </button>
                        </div>
                    </div>
                );
                
            case 'friends':
                buttonText = 'Удалить из друзей';
                buttonClass = styles.removeFriendButton;
                buttonHandler = handleRemoveFriend;
                break;
                
            default:
                buttonText = 'Добавить в друзья';
                buttonClass = styles.addFriendButton;
                buttonHandler = handleSendFriendRequest;
        }

        // Если это не входящая заявка с двумя кнопками, показываем одну кнопку
        return (
            <div className={styles.friendshipContainer}>
                {renderFriendshipStatus()}
                <button 
                    className={`${styles.actionButton} ${buttonClass}`}
                    onClick={buttonHandler}
                    disabled={friendActionLoading || user.friendshipStatus === 'pending_sent'}
                >
                    {buttonText}
                </button>
            </div>
        );
    };

    const handleAvatarClick = () => {
        if (currentUser?.id === parseInt(userId || '')) {
            fileInputRef.current?.click();
        }
    };

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;

        const formData = new FormData();
        formData.append('avatar', file);

        try {
            const response = await api.post(`/users/${user.id}/avatar`, formData);
            if (!response || typeof response !== 'object' || !response.avatar) {
                throw new Error('Некорректный формат ответа сервера');
            }
            
            // Обновляем состояние пользователя с новым аватаром
            setUser(prevUser => ({
                ...prevUser!,
                avatar: response.avatar
            }));
            setError(null);
            
            // Очищаем input после успешной загрузки
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (err: any) {
            console.error('Ошибка при загрузке аватара:', err);
            setError(err.message || 'Не удалось загрузить аватар');
            
            // Очищаем input в случае ошибки
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    if (error) {
        return <div className={styles.error}>{error}</div>;
    }

    if (!user) {
        return <div>Загрузка...</div>;
    }

    const isCurrentUser = currentUser?.id === parseInt(userId || '');
    const userInitials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();

    return (
        <div className={styles.userPage}>
            <div className={styles.userInfo}>
                <div className={styles.userHeader}>
                    <div className={styles.avatarContainer} onClick={handleAvatarClick}>
                        {user.avatar ? (
                            <ServerImage
                                path={user.avatar.path}
                                className={styles.avatar}
                                alt={`${user.firstName} ${user.lastName}`}
                            />
                        ) : (
                            <div className={styles.defaultAvatar}>{userInitials}</div>
                        )}
                        {isCurrentUser && (
                            <div className={styles.avatarUpload}>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    id="avatar-input"
                                    accept="image/*"
                                    onChange={handleAvatarUpload}
                                    style={{ display: 'none' }}
                                />
                                <label htmlFor="avatar-input" className={styles.uploadButton}>
                                    Изменить аватар
                                </label>
                            </div>
                        )}
                    </div>
                    <div className={styles.userDetails}>
                        <h1>{`${user.firstName} ${user.lastName}`}</h1>
                        <p className={styles.email}>{user.email}</p>
                        
                        {/* Кнопка добавления в друзья */}
                        <FriendshipButton />
                        
                        <div className={styles.status}>
                            {isEditing ? (
                                <div className={styles.statusEdit}>
                                    <input
                                        type="text"
                                        value={newStatus}
                                        onChange={(e) => setNewStatus(e.target.value)}
                                        disabled={isSubmitting}
                                    />
                                    <button onClick={handleStatusSave} disabled={isSubmitting}>
                                        Сохранить
                                    </button>
                                    <button onClick={() => setIsEditing(false)} disabled={isSubmitting}>
                                        Отмена
                                    </button>
                                </div>
                            ) : (
                                <div className={styles.statusDisplay}>
                                    <p>{user.status || 'Нет статуса'}</p>
                                    {isCurrentUser && (
                                        <button
                                            className={styles.editButton}
                                            onClick={() => setIsEditing(true)}
                                        >
                                            Изменить статус
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <Showcase userId={userId || ''} />

            <div className={styles.wallSection}>
                {isCurrentUser && (
                    <CreatePostForm 
                        onSuccess={handlePostCreated}
                        wallOwnerId={parseInt(userId || '')}
                    />
                )}
                
                {wallPosts.length === 0 && !postsLoading ? (
                    <div className={styles.emptyWall}>
                        Нет записей
                    </div>
                ) : (
                    <div className={styles.posts}>
                        {wallPosts.map((post, index) => {
                            // Если это последний элемент и есть еще данные для загрузки,
                            // добавляем ref для отслеживания
                            if (index === wallPosts.length - 1 && hasMorePostsToLoad) {
                                return (
                                    <div key={post.id} ref={lastElementRef}>
                                        <Post
                                            post={post}
                                            onDelete={() => handlePostDeleted(post.id)}
                                        />
                                    </div>
                                );
                            }
                            return (
                                <Post
                                    key={post.id}
                                    post={post}
                                    onDelete={() => handlePostDeleted(post.id)}
                                />
                            );
                        })}
                        
                        {postsLoading && (
                            <div className={styles.loading}>
                                <div className={styles.loadingSpinner}></div>
                                <p>Загрузка записей...</p>
                            </div>
                        )}
                        
                        {postsError && (
                            <div className={styles.error}>
                                <p>😕 Ошибка при загрузке записей</p>
                                <button 
                                    className={styles.retryButton}
                                    onClick={() => setRefreshPostsKey(prev => prev + 1)}
                                >
                                    Попробовать снова
                                </button>
                            </div>
                        )}
                        
                        {!postsLoading && !postsError && wallPosts.length > 0 && !hasMorePostsToLoad && (
                            <div className={styles.endOfFeed}>
                                <div className={styles.endOfFeedLine}></div>
                                <div className={styles.endOfFeedText}>Конец ленты</div>
                                <div className={styles.endOfFeedLine}></div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}; 