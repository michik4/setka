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
import { PhotoViewer } from '../PhotoViewer/PhotoViewer';

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
    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

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
            
            if (!response) {
                throw new Error('Нет ответа от сервера');
            }
            
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
    const canDelete = Boolean(user && (user.id === post.authorId || (post.wallOwnerId && user.id === post.wallOwnerId)));

    const handleDelete = async () => {
        if (!window.confirm('Вы уверены, что хотите удалить этот пост?')) {
            return;
        }

        try {
            setIsSubmitting(true);
            const endpoint = post.wallOwnerId ? `/wall/${post.id}` : `/posts/${post.id}`;
            
            // Сначала удаляем пост
            await api.delete(endpoint);
            
            // Затем удаляем все фотографии поста
            for (const photo of post.photos) {
                await api.delete(`/photos/${photo.id}`);
            }
            
            // Закрываем режим редактирования и вызываем колбэк
            setIsEditing(false);
            onDelete?.();
        } catch (err) {
            console.error('Ошибка при удалении поста:', err);
            setError('Не удалось удалить пост');
        } finally {
            setIsSubmitting(false);
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

        // Проверяем, были ли изменения
        const contentChanged = editedContent.trim() !== post.content.trim();
        const photosChanged = editedPhotos.length !== post.photos.length || 
            editedPhotos.some(photo => !post.photos.some(p => p.id === photo.id));

        // Если нет изменений, просто выходим из режима редактирования
        if (!contentChanged && !photosChanged) {
            setIsEditing(false);
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const endpoint = post.wallOwnerId ? `/wall/${post.id}` : `/posts/${post.id}`;
            
            // Сначала отвязываем удаленные фотографии
            const removedPhotos = post.photos.filter(photo => 
                !editedPhotos.some(editedPhoto => editedPhoto.id === photo.id)
            );
            
            for (const photo of removedPhotos) {
                await api.delete(`/photos/${photo.id}/posts/${post.id}`);
            }
            
            // Затем обновляем пост
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
        if (!window.confirm('Вы уверены, что хотите удалить эту фотографию?')) {
            return;
        }

        try {
            // Удаляем фотографию
            await api.delete(`/photos/${photo.id}`);

            // Обновляем локальное состояние
            const updatedPhoto = { ...photo, isDeleted: true };
            
            // Обновляем editedPhotos, сохраняя удаленную фотографию
            setEditedPhotos(prev => prev.map(p => 
                p.id === photo.id ? updatedPhoto : p
            ));
            
            // Обновляем фотографии в посте, сохраняя удаленную фотографию
            post.photos = post.photos.map(p => 
                p.id === photo.id ? updatedPhoto : p
            );
            onUpdate?.(post);
        } catch (err) {
            console.error('Ошибка при удалении фотографии:', err);
            setError('Не удалось удалить фотографию');
        }
    };

    const handleImageUploaded = (photo: Photo) => {
        setEditedPhotos(prev => [...prev, photo]);
        setError(null);
    };

    const handlePhotoClick = (photo: Photo, index: number) => {
        setSelectedPhoto(photo);
        setSelectedPhotoIndex(index);
    };

    const handlePhotoChange = (photo: Photo) => {
        setSelectedPhoto(photo);
        const index = post.photos.findIndex(p => p.id === photo.id);
        setSelectedPhotoIndex(index);
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
                            isEditing={true}
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
                            {canDelete && (
                                <button 
                                    className={`${styles.actionButton} ${styles.deleteButton}`}
                                    onClick={handleDelete}
                                    disabled={isSubmitting}
                                >
                                    Удалить пост
                                </button>
                            )}
                        </div>
                        <div className={styles.editButtonsRight}>
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
                    <div className={styles.content}>{post.content}</div>
                    {post.photos && post.photos.length > 0 && (
                        <PhotoGrid 
                            photos={post.photos} 
                            onPhotoDelete={handlePhotoDelete}
                            canDelete={Boolean(canDelete)}
                            isEditing={isEditing}
                            isWallPost={Boolean(post.wallOwnerId)}
                            onPhotoClick={handlePhotoClick}
                        />
                    )}

                    {selectedPhoto && (
                        <PhotoViewer
                            photo={selectedPhoto}
                            onClose={() => {
                                setSelectedPhoto(null);
                                setSelectedPhotoIndex(null);
                            }}
                            onDelete={canDelete ? () => handlePhotoDelete(selectedPhoto) : undefined}
                            canDelete={canDelete}
                            isWallPost={Boolean(post.wallOwnerId)}
                            allPhotos={post.photos}
                            currentIndex={selectedPhotoIndex || 0}
                            onPhotoChange={handlePhotoChange}
                        />
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
                </>
            )}

            {error && <div className={styles.error}>{error}</div>}
        </div>
    );
};