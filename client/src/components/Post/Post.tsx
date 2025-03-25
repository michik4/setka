import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Post as PostType } from '../../types/post.types';
import { Photo } from '../../types/post.types';
import { PhotoGrid } from '../PhotoGrid/PhotoGrid';
import { ImageUploader } from '../ImageUploader/ImageUploader';
import { ImageSelector } from '../ImageSelector/ImageSelector';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import styles from './Post.module.css';
import { ServerImage } from '../ServerImage/ServerImage';

interface PostProps {
    post: PostType;
    onDelete?: () => void;
    onUpdate?: (updatedPost: PostType) => void;
}

export const Post: React.FC<PostProps> = ({ post, onDelete, onUpdate }) => {
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(post.content);
    const [editedPhotos, setEditedPhotos] = useState<Photo[]>(post.photos || []);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [liked, setLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(post.likesCount);
    const [isLikeLoading, setIsLikeLoading] = useState(false);

    useEffect(() => {
        // Проверяем, лайкнул ли пользователь этот пост
        const checkLike = async () => {
            try {
                const endpoint = post.wallOwnerId ? `/wall/${post.id}/like` : `/posts/${post.id}/like`;
                console.log('[Post] Проверка лайка:', endpoint);
                const response = await api.get(endpoint);
                console.log('[Post] Результат проверки лайка:', response);
                
                if (response && typeof response.liked === 'boolean') {
                    setLiked(response.liked);
                    if (typeof response.likesCount === 'number') {
                        setLikesCount(response.likesCount);
                    }
                }
            } catch (error) {
                console.error('Ошибка при проверке лайка:', error);
            }
        };

        checkLike();
    }, [post.id, post.wallOwnerId]);

    const handleLike = async () => {
        if (isLikeLoading) return;

        setIsLikeLoading(true);
        try {
            const endpoint = post.wallOwnerId ? `/wall/${post.id}/like` : `/posts/${post.id}/like`;
            console.log('[Post] Отправка запроса на лайк:', endpoint);
            
            const response = await api.post(endpoint, {});
            console.log('[Post] Получен ответ от сервера:', response);
            
            // Проверяем, что response не null и не undefined
            if (!response) {
                throw new Error('Нет ответа от сервера');
            }
            
            // Проверяем наличие данных в ответе
            if (typeof response.liked === 'boolean' && typeof response.likesCount === 'number') {
                setLiked(response.liked);
                setLikesCount(response.likesCount);
            } else {
                console.error('Некорректный формат ответа:', response);
                throw new Error('Некорректный формат ответа от сервера');
            }
        } catch (error) {
            console.error('Ошибка при обработке лайка:', error);
            setError('Не удалось обработать лайк. Попробуйте позже.');
        } finally {
            setIsLikeLoading(false);
        }
    };

    // Автор может редактировать свой пост
    const canEdit = user && user.id === post.authorId;
    // Автор и владелец стены могут удалять посты
    const canDelete = user && (user.id === post.authorId || (post.wallOwnerId && user.id === post.wallOwnerId));

    const handleDelete = async () => {
        if (!window.confirm('Вы уверены, что хотите удалить этот пост?')) {
            return;
        }

        try {
            const endpoint = post.wallOwnerId ? `/wall/${post.id}` : `/posts/${post.id}`;
            await api.delete(endpoint);
            onDelete?.();
        } catch (err) {
            console.error('Ошибка при удалении поста:', err);
            setError('Не удалось удалить пост');
        }
    };

    const handleEdit = async () => {
        if (!isEditing) {
            setIsEditing(true);
            return;
        }

        if (editedContent.trim() === '' && editedPhotos.length === 0) {
            setError('Пост не может быть пустым');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const endpoint = post.wallOwnerId ? `/wall/${post.id}` : `/posts/${post.id}`;
            const response = await api.put(endpoint, { 
                content: editedContent.trim(),
                photoIds: editedPhotos.map(photo => photo.id)
            });
            
            setIsEditing(false);
            
            // Обновляем пост локально
            const updatedPost = {
                ...post,
                content: editedContent.trim(),
                photos: editedPhotos
            };
            
            // Вызываем колбэк обновления
            onUpdate?.(updatedPost);
            
            // Обновляем локальное состояние
            post.content = editedContent.trim();
            post.photos = editedPhotos;
        } catch (err) {
            console.error('Ошибка при редактировании поста:', err);
            setError('Не удалось отредактировать пост');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePhotoDelete = async (photo: Photo) => {
        try {
            // Отвязываем фотографию от поста вместо её удаления
            await api.delete(`/photos/${photo.id}/posts/${post.id}`);
            // Обновляем фотографии локально
            setEditedPhotos(prev => prev.filter(p => p.id !== photo.id));
            if (!isEditing) {
                post.photos = post.photos.filter(p => p.id !== photo.id);
            }
        } catch (err) {
            console.error('Ошибка при удалении фотографии из поста:', err);
            alert('Не удалось удалить фотографию из поста');
        }
    };

    const handleImageUploaded = (photo: Photo) => {
        setEditedPhotos(prev => [...prev, photo]);
        setError(null);
    };

    return (
        <div className={styles.post}>
            <div className={styles.header}>
                <div className={styles.authorInfo}>
                    <ServerImage
                        path={post.author.avatar?.path}
                        alt={`${post.author.firstName} ${post.author.lastName}`}
                        className={styles.authorAvatar}
                    />
                    <Link to={`/users/${post.author.id}`} className={styles.author}>
                        {post.author.firstName} {post.author.lastName}
                    </Link>
                </div>
                <div className={styles.date}>
                    {new Date(post.createdAt).toLocaleString()}
                </div>
            </div>
            
            {isEditing ? (
                <div className={styles.editContainer}>
                    <textarea
                        className={styles.editTextarea}
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        rows={4}
                    />

                    <div className={styles.editPhotos}>
                        <PhotoGrid 
                            photos={editedPhotos}
                            onPhotoDelete={handlePhotoDelete}
                            canDelete={true}
                        />
                        
                        <ImageUploader
                            onImageUploaded={handleImageUploaded}
                            onError={(err) => setError(err)}
                        />

                        {user && (
                            <ImageSelector
                                userId={user.id}
                                selectedImages={editedPhotos}
                                onImagesChange={setEditedPhotos}
                            />
                        )}
                    </div>

                    {error && <div className={styles.error}>{error}</div>}
                    <div className={styles.editButtons}>
                        <div className={styles.editButtonsLeft}>
                            {canDelete && (
                                <button
                                    className={`${styles.actionButton} ${styles.deleteButton}`}
                                    onClick={handleDelete}
                                >
                                    Удалить
                                </button>
                            )}
                        </div>
                        <div className={styles.editButtonsRight}>
                            <button
                                className={`${styles.actionButton} ${styles.cancelButton}`}
                                onClick={() => {
                                    setIsEditing(false);
                                    setEditedContent(post.content);
                                    setEditedPhotos(post.photos || []);
                                    setError(null);
                                }}
                                disabled={isSubmitting}
                            >
                                Отмена
                            </button>
                            <button
                                className={`${styles.actionButton} ${styles.saveButton}`}
                                onClick={handleEdit}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Сохранение...' : 'Сохранить'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {post.content && (
                        <div className={styles.content}>
                            {post.content}
                        </div>
                    )}

                    {post.photos && post.photos.length > 0 && (
                        <PhotoGrid 
                            photos={post.photos} 
                            onPhotoDelete={canDelete ? handlePhotoDelete : undefined}
                            canDelete={Boolean(canDelete)}
                        />
                    )}
                </>
            )}

            <div className={styles.footer}>
                <button 
                    className={`${styles.actionButton} ${styles.likeButton} ${liked ? styles.liked : ''}`}
                    onClick={handleLike}
                    disabled={isLikeLoading}
                >
                    {isLikeLoading ? '...' : liked ? 'Нравится' : 'Нравится'} • {likesCount}
                </button>
                
                <div className={styles.actions}>
                    <button className={styles.actionButton}>
                        💬 {post.commentsCount || 0}
                    </button>
                    <button className={styles.actionButton}>
                        🔄 {post.sharesCount || 0}
                    </button>
                </div>

                <div className={styles.modifyButtons}>
                    {canEdit && !isEditing && (
                        <button
                            className={`${styles.actionButton} ${styles.editButton}`}
                            onClick={() => setIsEditing(true)}
                        >
                            Редактировать
                        </button>
                    )}
                </div>
            </div>

            {error && <div className={styles.error}>{error}</div>}
        </div>
    );
};