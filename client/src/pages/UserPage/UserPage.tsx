import React, { useEffect, useState, useRef } from 'react';
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

export const UserPage: React.FC = () => {
    const params = useParams<{ userId: string }>();
    const userId = params.userId;
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const [user, setUser] = useState<User | null>(null);
    const [wallPosts, setWallPosts] = useState<PostType[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [newStatus, setNewStatus] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const fetchWallPosts = async () => {
        if (!userId) return;

        const id = parseInt(userId);
        if (isNaN(id)) return;

        try {
            const response = await api.get(`/wall/${id}`);
            if (!response || typeof response !== 'object' || !Array.isArray(response.posts)) {
                console.error('Неверный формат данных постов:', response);
                return;
            }
            setWallPosts(response.posts);
        } catch (err) {
            console.error('Ошибка при получении постов:', err);
            setWallPosts([]); // Устанавливаем пустой массив в случае ошибки
        }
    };

    useEffect(() => {
        fetchUserInfo();
        fetchWallPosts();
    }, [userId]);

    const handlePostCreated = () => {
        fetchWallPosts();
    };

    const handlePostDeleted = (postId: number) => {
        setWallPosts(prev => prev.filter(post => post.id !== postId));
    };

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
                
                {wallPosts.length > 0 ? (
                    <div className={styles.posts}>
                        {wallPosts.map(post => (
                            <Post
                                key={post.id}
                                post={post}
                                onDelete={() => handlePostDeleted(post.id)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className={styles.emptyWall}>
                        Нет записей
                    </div>
                )}
            </div>
        </div>
    );
}; 